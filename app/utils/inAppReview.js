import InAppReview from 'react-native-in-app-review';
import { Platform } from 'react-native';
import safeStorage from './safeStorage';

const GETTING_STARTED_GOOGLE_PLAY_REVIEW_KEY = 'reviews.googlePlay.gettingStarted.v1.prompted';

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

export const requestGooglePlayReviewAfterGettingStarted = async () => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const alreadyPrompted = await safeStorage.getItem(GETTING_STARTED_GOOGLE_PLAY_REVIEW_KEY);
    if (alreadyPrompted === 'true') {
      return false;
    }

    const didOpenPrompt = await requestInAppStoreReview();
    if (!didOpenPrompt) {
      return false;
    }

    await safeStorage.setItem(GETTING_STARTED_GOOGLE_PLAY_REVIEW_KEY, 'true');
    return true;
  } catch (_error) {
    return false;
  }
};
