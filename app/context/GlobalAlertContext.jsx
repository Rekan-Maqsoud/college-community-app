import React, { createContext, useContext, useState, useCallback } from 'react';

const GlobalAlertContext = createContext(null);

export const useGlobalAlert = () => {
  const context = useContext(GlobalAlertContext);
  if (!context) {
    return null;
  }
  return context;
};

export const GlobalAlertProvider = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = useCallback((titleOrConfig, message, typeOrButtons, buttons) => {
    if (typeof titleOrConfig === 'object') {
      setAlertConfig({
        visible: true,
        type: titleOrConfig.type || 'info',
        title: titleOrConfig.title || '',
        message: titleOrConfig.message || '',
        buttons: titleOrConfig.buttons || [],
      });
    } else {
      let finalType = 'info';
      let finalButtons = [];

      if (Array.isArray(typeOrButtons)) {
        finalButtons = typeOrButtons;
      } else {
        finalType = typeOrButtons || 'info';
        finalButtons = buttons || [];
      }

      setAlertConfig({
        visible: true,
        type: finalType,
        title: titleOrConfig || '',
        message: message || '',
        buttons: finalButtons,
      });
    }
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  return (
    <GlobalAlertContext.Provider value={{ alertConfig, showAlert, hideAlert }}>
      {children}
    </GlobalAlertContext.Provider>
  );
};

export default GlobalAlertProvider;
