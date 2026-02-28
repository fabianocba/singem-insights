import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '../../ui/feedback.js';

export function showToast(message, type = 'info') {
  if (type === 'success') {
    notifySuccess(message);
    return;
  }
  if (type === 'warning') {
    notifyWarning(message);
    return;
  }
  if (type === 'error') {
    notifyError(message);
    return;
  }
  notifyInfo(message);
}
