export const getMessageInputActionItems = ({
  t,
  locationLoading,
  showMentionButton,
  handlers,
}) => {
  const actionItems = [
    {
      key: 'gallery',
      icon: 'images',
      color: '#8B5CF6',
      label: t('chats.gallery') || 'Gallery',
      onPress: handlers.handlePickImage,
    },
    {
      key: 'camera',
      icon: 'camera',
      color: '#10B981',
      label: t('chats.camera') || 'Camera',
      onPress: handlers.handleTakePicture,
    },
    {
      key: 'location',
      icon: 'location',
      color: '#F59E0B',
      label: t('chats.location') || 'Location',
      onPress: handlers.handleSendLocation,
      loading: locationLoading,
    },
    {
      key: 'tag',
      icon: 'at',
      color: '#6366F1',
      label: t('chats.tagUser') || 'Tag',
      onPress: handlers.handleTagUser,
      hidden: !showMentionButton,
    },
    {
      key: 'file',
      icon: 'document',
      color: '#3B82F6',
      label: t('chats.file') || 'File',
      onPress: handlers.handleSendFile,
    },
    {
      key: 'gif',
      icon: 'happy',
      color: '#EC4899',
      label: t('chats.gifSticker') || 'GIF',
      onPress: handlers.handleOpenGiphy,
    },
    {
      key: 'poll',
      icon: 'bar-chart',
      color: '#6366F1',
      label: t('chats.poll'),
      onPress: handlers.handleOpenPollComposer,
    },
  ];

  return actionItems.filter((item) => !item.hidden);
};
