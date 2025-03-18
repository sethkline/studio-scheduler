export const formatTimeForAPI = (date) => {
  if (!date) return null;
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`;
};
// Date formatting utility
export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString();
};

// Time formatting utility
export const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};