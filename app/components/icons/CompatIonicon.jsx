import React from 'react';
import IoniconSvg from './IoniconSvg';

function CompatIonicon({ name, size = 24, color, style, ...rest }) {
  return <IoniconSvg name={name} size={size} color={color} style={style} {...rest} />;
}

export const Ionicons = React.memo(CompatIonicon);
export default Ionicons;
