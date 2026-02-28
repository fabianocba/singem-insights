import { hideLoading as hideFeedbackLoading, showLoading as showFeedbackLoading } from '../../ui/feedback.js';

export function showLoader(message = 'Processando...') {
  showFeedbackLoading(message);
}

export function hideLoader() {
  hideFeedbackLoading();
}
