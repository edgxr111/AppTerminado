import Toast from 'react-native-toast-message';

export const showToast = (type: 'success' | 'error' | 'info', text1: string, text2?: string) => {
  Toast.show({
    type,
    text1,
    text2,
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 30,
    position: 'top'
  });
};

export const showSuccess = (title: string, message?: string) => {
  showToast('success', title, message);
};

export const showError = (title: string, message?: string) => {
  showToast('error', title, message);
};

export const showInfo = (title: string, message?: string) => {
  showToast('info', title, message);
};
