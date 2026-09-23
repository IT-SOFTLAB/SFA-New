import api from "./axios";

const BASE_URL = "/auth";

const authApi = {
  login(credentials) {
    return api.post(`${BASE_URL}/login`, credentials);
  },

  getMe() {
    return api.get(`${BASE_URL}/me`);
  },

  updateProfile(data) {
    return api.put(`${BASE_URL}/me`, data);
  },

  uploadAvatar(file) {
    const formData = new FormData();
    formData.append("avatar", file);
    return api.post(`${BASE_URL}/avatar`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  changePassword(data) {
    return api.post(`${BASE_URL}/change-password`, data);
  },

  logout() {
    return api.post(`${BASE_URL}/logout`);
  },

  forgotPassword(email) {
    return api.post(`${BASE_URL}/forgot-password`, { email });
  },

  resetPassword(data) {
    return api.post(`${BASE_URL}/reset-password`, data);
  },
};

export default authApi;
