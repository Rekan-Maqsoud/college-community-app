import React from 'react';
import { View } from 'react-native';

const LiquidGlassViewCompat = ({
	children,
	style,
	colorScheme: _colorScheme,
	effect: _effect,
	tintColor: _tintColor,
	...viewProps
}) => {
	return (
		<View style={style} {...viewProps}>
			{children}
		</View>
	);
};

export default LiquidGlassViewCompat;
