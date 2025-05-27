export const getCurrentTime = () => {
  return new Date().toLocaleTimeString();
};

export const getCurrentDate = () => {
  return new Date().toLocaleDateString();
};

export default Date;
