import InAppReview from 'react-native-in-app-review';

export const requestInAppStoreReview = async () => {
  try {
    if (!InAppReview?.isAvailable || !InAppReview.isAvailable()) {
      return false;
    }

    await InAppReview.RequestInAppReview();
    return true;
  } catch (_error) {
    return false;
  }
};
