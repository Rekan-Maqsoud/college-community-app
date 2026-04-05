import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

const KeyboardAwareView = ({ children, style, keyboardVerticalOffset = 0, ...props }) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, style]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardVerticalOffset : keyboardVerticalOffset + 20}
      {...props}>
      {children}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default KeyboardAwareView;
