// API endpoints with exports
export const getUsers = () => fetch("/api/users");
export const getUserById = (id: string) => fetch(`/api/users/${id}`);

export default {
  getUsers,
  getUserById,
};
