import { AppError } from '../../../shared/response.js';
import { prisma } from '../../../config/database.js';
import { parseExcelBuffer } from '../utils/excel-parser.js';
import { generateSampleTemplate, generateExportExcel } from '../utils/excel-exporter.js';
import { findCustomerMatch, findProductMatch, findBranchMatch, findTerritoryMatch } from '../utils/field-mapper.js';
import { formatImportSummary, formatImportRow } from '../dto/crm-integration.dto.js';
import { IMPORT_STATUS, ROW_STATUS } from '../constants/crm-integration.constants.js';
import { CustomerService } from '../../customers/customers.service.js';
import { CustomerRepository } from '../../customers/customers.repository.js';
import cacheService from '../../../shared/cache/cache.service.js';

export class CRMIntegrationService {
  constructor(repository) {
    this.repo = repository;
    this.customerRepo = new CustomerRepository();
    this.customerService = new CustomerService(this.customerRepo);
  }

  /**
   * Find existing Customer or Create/Update Customer from Excel Row
   */
  async getOrCreateCustomer(organizationId, row) {
    // 1. Try to find an existing customer match by crmId, phone, or email
    let customer = await findCustomerMatch(organizationId, row);
    if (customer) {
      // If the Excel row contains an updated email, phone, name, or CRM ID, update the existing customer record!
      const updates = {};
      if (row.email && typeof row.email === 'string' && row.email.trim()) {
        const newEmail = row.email.trim();
        if (!customer.email || customer.email.toLowerCase() !== newEmail.toLowerCase()) {
          updates.email = newEmail;
        }
      }
      if (row.phoneNumber && typeof row.phoneNumber === 'string' && row.phoneNumber.trim()) {
        const newPhone = row.phoneNumber.trim();
        if (!customer.phone || customer.phone !== newPhone) {
          updates.phone = newPhone;
        }
      }
      if (row.customerName && typeof row.customerName === 'string' && row.customerName.trim()) {
        const newName = row.customerName.trim();
        if (!customer.name || customer.name !== newName) {
          updates.name = newName;
        }
      }
      if (row.crmCustomerId && !customer.crmId) {
        updates.crmId = row.crmCustomerId;
      }

      if (Object.keys(updates).length > 0) {
        try {
          customer = await this.customerService.update(customer.id, organizationId, updates);
        } catch (err) {
          customer = await this.customerRepo.update(customer.id, organizationId, updates);
        }
      }

      return customer;
    }

    // 2. If no customer exists, prepare customer data for creation
    const customerName = row.customerName || (row.crmCustomerId ? `Customer ${row.crmCustomerId}` : null);
    if (!customerName) {
      return null;
    }

    const addressObj = {
      street: row.address || null,
      city: row.city || null,
      postalCode: row.pincode || null,
    };

    const customerData = {
      name: customerName,
      phone: row.phoneNumber || null,
      email: row.email || null,
      crmId: row.crmCustomerId || null,
      address: addressObj,
      customFields: row.customFields && Object.keys(row.customFields).length > 0 ? row.customFields : null,
    };

    try {
      customer = await this.customerService.create(organizationId, customerData);
    } catch (err) {
      // Fallback: If geocoding or service wrapper fails, create directly via customerRepo
      customer = await this.customerRepo.create({
        ...customerData,
        organizationId,
      });
    }

    return customer;
  }

  /**
   * Process Excel Upload & Save CRM Import + Rows
   */
  async processExcelImport(file, user) {
    if (!file || !file.buffer) {
      throw AppError.badRequest('No Excel file uploaded. Please upload a valid .xlsx or .xls file.');
    }

    const organizationId = user.organizationId;
    const fileName = file.originalname || 'crm_import.xlsx';

    // 1. Parse Excel buffer
    const parsedRows = parseExcelBuffer(file.buffer);

    // 2. Create CRMImport record
    const importRecord = await this.repo.createImport({
      organizationId,
      fileName,
      uploadedBy: user.id,
      totalRows: parsedRows.length,
      status: IMPORT_STATUS.PROCESSING,
    });

    let successfulRows = 0;
    let failedRows = 0;
    let unmappedCustomersCount = 0;
    let invalidProductsCount = 0;
    let unmappedBranchesCount = 0;
    const rowErrors = [];

    const dbRowsToCreate = [];

    // 3. Process each parsed row
    for (const row of parsedRows) {
      const rowErrorsList = [];
      let mappedCustomer = null;
      let mappedProduct = null;
      let mappedBranch = null;
      let mappedTerritory = null;

      // Validate required CRM customer ID or Product reference
      if (!row.crmCustomerId && !row.customerName) {
        rowErrorsList.push('Missing Customer ID / Customer Name');
      }

      if (!row.crmProductId && !row.productCode) {
        rowErrorsList.push('Missing Product ID / Product Code');
      }

      if (row.quantity === null || row.quantity === undefined || isNaN(row.quantity) || row.quantity <= 0) {
        rowErrorsList.push('Invalid Quantity (must be greater than 0)');
      }

      // Initial lookup / create matches
      mappedCustomer = await this.getOrCreateCustomer(organizationId, row);
      mappedProduct = await findProductMatch(organizationId, row);
      mappedBranch = (await findBranchMatch(organizationId, row)) || (user?.branchId ? { id: user.branchId } : null);
      mappedTerritory = await findTerritoryMatch(organizationId, row);

      let rowStatus = ROW_STATUS.PENDING;

      if (rowErrorsList.length > 0) {
        rowStatus = ROW_STATUS.FAILED;
        failedRows++;
        rowErrors.push({
          row: row.rowNumber,
          customerId: row.crmCustomerId || row.customerName || 'N/A',
          error: rowErrorsList.join(', '),
        });
      } else {
        if (!mappedCustomer) {
          unmappedCustomersCount++;
          rowStatus = ROW_STATUS.UNMAPPED_CUSTOMER;
          rowErrorsList.push('Failed to create or find matching customer');
        }

        if (!mappedProduct) {
          invalidProductsCount++;
          if (rowStatus === ROW_STATUS.PENDING) {
            rowStatus = ROW_STATUS.INVALID_PRODUCT;
          }
          rowErrorsList.push('Product ID/Code not found or inactive in SFA Inventory');
        }

        if (!mappedBranch) {
          unmappedBranchesCount++;
          if (rowStatus === ROW_STATUS.PENDING) {
            rowStatus = ROW_STATUS.UNMAPPED_BRANCH;
          }
        }

        if (mappedCustomer && mappedProduct) {
          rowStatus = ROW_STATUS.MAPPED;
          successfulRows++;
        }
      }

      dbRowsToCreate.push({
        importId: importRecord.id,
        organizationId,
        rowNumber: row.rowNumber,
        crmCustomerId: row.crmCustomerId || null,
        crmProductId: row.crmProductId || null,
        customerName: row.customerName || null,
        phoneNumber: row.phoneNumber || null,
        email: row.email || null,
        city: row.city || null,
        pincode: row.pincode || null,
        address: row.address || null,
        productCode: row.productCode || null,
        productName: row.productName || null,
        quantity: row.quantity !== null && !isNaN(row.quantity) ? row.quantity : null,
        requirement: row.requirement || null,
        leadSource: row.leadSource || null,
        expectedValue: row.expectedValue !== null && !isNaN(row.expectedValue) ? row.expectedValue : null,
        customFields: row.customFields || {},
        mappedCustomerId: mappedCustomer ? mappedCustomer.id : null,
        mappedProductId: mappedProduct ? mappedProduct.id : null,
        mappedBranchId: mappedBranch ? mappedBranch.id : null,
        mappedTerritoryId: mappedTerritory ? mappedTerritory.id : null,
        status: rowStatus,
        errorMessage: rowErrorsList.length > 0 ? rowErrorsList.join('; ') : null,
      });
    }

    // 4. Save CRMImportRow batch
    await this.repo.createImportRows(dbRowsToCreate);

    // 5. Compute overall import status & summary
    let finalStatus = IMPORT_STATUS.COMPLETED;
    if (failedRows > 0 && successfulRows > 0) {
      finalStatus = IMPORT_STATUS.PARTIAL;
    } else if (failedRows > 0 || invalidProductsCount > 0 || unmappedCustomersCount > 0) {
      finalStatus = successfulRows > 0 ? IMPORT_STATUS.PARTIAL : IMPORT_STATUS.FAILED;
    }

    const summary = {
      totalRows: parsedRows.length,
      successfulRows, // Fully mapped rows ready for conversion
      mappedRows: successfulRows,
      stagedRows: dbRowsToCreate.length,
      failedRows,
      duplicateRows: 0,
      unmappedCustomers: unmappedCustomersCount,
      invalidProducts: invalidProductsCount,
      unmappedBranches: unmappedBranchesCount,
    };

    const updatedImport = await this.repo.updateImport(importRecord.id, organizationId, {
      totalRows: parsedRows.length,
      successfulRows,
      failedRows,
      status: finalStatus,
      summary,
      errors: rowErrors,
      completedAt: new Date(),
    });

    const fullRecord = await this.repo.findImportById(importRecord.id, organizationId);
    return formatImportSummary(fullRecord);
  }

  /**
   * List Import History
   */
  async listImports(organizationId, query = {}) {
    const cacheKey = `crm:imports:${organizationId}:${JSON.stringify(query || {})}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const page = parseInt(query.page, 10) || 1;
    const limit = Math.min(100, parseInt(query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const { imports, total } = await this.repo.findImports(organizationId, {
      skip,
      take: limit,
      status: query.status,
    });

    const result = {
      imports: imports.map(formatImportSummary),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    cacheService.set(cacheKey, result, 600);
    return result;
  }

  /**
   * Get Import Details by ID
   */
  async getImportById(id, organizationId) {
    const importRecord = await this.repo.findImportById(id, organizationId);
    if (!importRecord) {
      throw AppError.notFound('CRM Import record not found');
    }
    return formatImportSummary(importRecord);
  }

  /**
   * Manual Product Mapping
   */
  async mapProduct(rowId, organizationId, productId) {
    const row = await this.repo.findImportRowById(rowId, organizationId);
    if (!row) throw AppError.notFound('CRM Import row not found');

    const product = await prisma.product.findFirst({
      where: { id: productId, organizationId, isActive: true },
    });
    if (!product) throw AppError.notFound('Active Product not found in your organization');

    let newStatus = row.status;
    if (row.mappedCustomerId && row.mappedBranchId) {
      newStatus = ROW_STATUS.MAPPED;
    }

    const updatedRow = await this.repo.updateImportRow(rowId, organizationId, {
      mappedProductId: productId,
      status: newStatus,
      errorMessage: null,
    });

    return formatImportRow(updatedRow);
  }

  /**
   * Manual Branch Mapping
   */
  async mapBranch(rowId, organizationId, branchId) {
    const row = await this.repo.findImportRowById(rowId, organizationId);
    if (!row) throw AppError.notFound('CRM Import row not found');

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId },
    });
    if (!branch) throw AppError.notFound('Branch not found in your organization');

    let newStatus = row.status;
    if (row.mappedCustomerId && row.mappedProductId) {
      newStatus = ROW_STATUS.MAPPED;
    }

    const updatedRow = await this.repo.updateImportRow(rowId, organizationId, {
      mappedBranchId: branchId,
      status: newStatus,
    });

    return formatImportRow(updatedRow);
  }

  /**
   * Manual Territory Mapping
   */
  async mapTerritory(rowId, organizationId, territoryId) {
    const row = await this.repo.findImportRowById(rowId, organizationId);
    if (!row) throw AppError.notFound('CRM Import row not found');

    const territory = await prisma.territory.findFirst({
      where: { id: territoryId, organizationId },
    });
    if (!territory) throw AppError.notFound('Territory not found in your organization');

    const updatedRow = await this.repo.updateImportRow(rowId, organizationId, {
      mappedTerritoryId: territoryId,
    });

    return formatImportRow(updatedRow);
  }

  /**
   * Sample Template Download
   */
  getTemplate() {
    return generateSampleTemplate();
  }

  /**
   * Export Mapped CRM Data to Excel
   */
  async exportMappedData(organizationId, importId) {
    let rows;
    if (importId) {
      rows = await this.repo.findImportRowsByImportId(importId, organizationId);
    } else {
      const allImports = await prisma.cRMImportRow.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          product: true,
          branch: true,
          territory: true,
        },
      });
      rows = allImports;
    }

    return generateExportExcel(rows);
  }

  /**
   * Convert Mapped CRM Import Rows into SFA Sales Orders + OrderItems
   */
  async convertToOrders(importId, userContext) {
    const userId = userContext.userId || userContext.id;
    const organizationId = userContext.organizationId;
    const importRecord = await this.repo.findImportById(importId, organizationId);
    if (!importRecord) {
      throw AppError.notFound('CRM Import record not found');
    }

    const eligibleRows = await this.repo.findMappedRowsForConversion(importId, organizationId);
    if (!eligibleRows || eligibleRows.length === 0) {
      return {
        importId,
        convertedOrdersCount: 0,
        convertedRowsCount: 0,
        message: 'No eligible MAPPED rows found for conversion in this import.',
        orders: [],
      };
    }

    // Group rows by (mappedCustomerId, mappedBranchId || 'GLOBAL')
    const grouped = new Map();
    for (const row of eligibleRows) {
      const key = `${row.mappedCustomerId}_${row.mappedBranchId || 'GLOBAL'}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(row);
    }

    const createdOrders = [];
    const processedRowIds = [];

    await prisma.$transaction(async (tx) => {
      let orderIndex = 1;
      for (const [key, rows] of grouped.entries()) {
        const firstRow = rows[0];
        const customerId = firstRow.mappedCustomerId;
        const branchId = firstRow.mappedBranchId || (firstRow.owner?.branchId || null);
        const territoryId = firstRow.mappedTerritoryId || userContext.territoryId || null;

        // Generate Order Number
        const timestamp = Date.now().toString().slice(-6);
        const orderNumber = `ORD-CRM-${timestamp}-${orderIndex++}`;
        const orderName = `CRM Import Order - ${firstRow.customer?.name || 'Customer'}`;

        let totalOrderAmount = 0;
        const itemsToCreate = [];

        for (const row of rows) {
          processedRowIds.push(row.id);

          const qty = parseInt(row.quantity) || 1;
          const unitPrice = (row.product && row.product.price !== undefined && row.product.price !== null && row.product.price > 0)
            ? parseFloat(row.product.price)
            : (row.expectedValue && qty > 0 ? parseFloat(row.expectedValue) / qty : 0);

          const itemTotal = qty * unitPrice;
          totalOrderAmount += itemTotal;

          itemsToCreate.push({
            productId: row.mappedProductId,
            description: row.requirement || row.productName || row.product?.name || 'Imported Product Item',
            quantity: qty,
            unitPrice: unitPrice,
            discountAmount: 0,
            taxAmount: 0,
          });
        }

        const order = await tx.order.create({
          data: {
            organizationId,
            orderNumber,
            orderName,
            customerId,
            ownerId: userId,
            branchId,
            territoryId,
            status: 'DRAFT',
            totalAmount: totalOrderAmount,
            currency: 'INR',
            items: {
              create: itemsToCreate,
            },
          },
          include: {
            customer: true,
            items: {
              include: { product: true },
            },
          },
        });

        createdOrders.push(order);
      }

      // Mark CRMImportRow status as PROCESSED
      await tx.cRMImportRow.updateMany({
        where: {
          id: { in: processedRowIds },
          organizationId,
        },
        data: {
          status: 'PROCESSED',
          errorMessage: null,
        },
      });

      // Update parent CRMImport record status
      await tx.cRMImport.update({
        where: { id: importId, organizationId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    });

    cacheService.invalidatePrefixes([
      `crm:imports:${organizationId}:`,
      `${organizationId}:customers:`,
      `${organizationId}:sales:`,
      `${organizationId}:dashboard:`,
    ]);

    return {
      importId,
      convertedOrdersCount: createdOrders.length,
      convertedRowsCount: processedRowIds.length,
      orders: createdOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        orderName: o.orderName,
        customerId: o.customerId,
        customerName: o.customer?.name,
        branchId: o.branchId,
        totalAmount: o.totalAmount,
        status: o.status,
        itemsCount: o.items?.length || 0,
        createdAt: o.createdAt,
      })),
    };
  }
}
