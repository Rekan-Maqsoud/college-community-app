import React from 'react';
import Svg, { Path, Circle, Rect, Ellipse, Line } from 'react-native-svg';

const replaceCurrentColor = (children, color) => React.Children.map(children, (child) => {
  if (!React.isValidElement(child)) {
    return child;
  }

  const nextProps = {};

  if (child.props.stroke === 'currentColor') {
    nextProps.stroke = color;
  }

  if (child.props.fill === 'currentColor') {
    nextProps.fill = color;
  }

  if (child.props.children) {
    nextProps.children = replaceCurrentColor(child.props.children, color);
  }

  return React.cloneElement(child, nextProps);
});

// Generic Icon wrapper
const Icon = ({ size = 24, color = '#111827', children, ...props }) => {
  const resolvedChildren = replaceCurrentColor(children, color);

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill={color} {...props}>
      {resolvedChildren}
    </Svg>
  );
};

// 1. mail-outline
export const MailIcon = props => (
  <Icon {...props}>
    <Rect x="48" y="96" width="416" height="320" rx="40" ry="40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M112 160l144 112 144-112" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </Icon>
);

// 2. lock-closed-outline
export const LockIcon = props => (
  <Icon {...props}>
    <Path d="M336 208v-95a80 80 0 00-160 0v95" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Rect x="96" y="208" width="320" height="272" rx="48" ry="48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </Icon>
);

// 3. lock-closed (filled)
export const LockFilledIcon = props => (
  <Icon {...props}>
    <Path d="M336 208v-95a80 80 0 00-160 0v95" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Rect x="96" y="208" width="320" height="272" rx="48" ry="48" />
  </Icon>
);

// 4. eye-outline
export const EyeIcon = props => (
  <Icon {...props}>
    <Path d="M255.66 112c-77.94 0-157.89 45.11-220.83 135.33a16 16 0 00-.27 17.77C82.92 340.8 161.8 400 255.66 400c92.84 0 173.34-59.38 221.79-135.25a16.14 16.14 0 000-17.47C428.89 172.28 347.8 112 255.66 112z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Circle cx="256" cy="256" r="80" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
  </Icon>
);

// 5. eye-off-outline
export const EyeOffIcon = props => (
  <Icon {...props}>
    <Path d="M432 432L80 80M255.66 112c-77.94 0-157.89 45.11-220.83 135.33a16 16 0 00-.27 17.77C82.92 340.8 161.8 400 255.66 400c92.84 0 173.34-59.38 221.79-135.25a16.14 16.14 0 000-17.47C428.89 172.28 347.8 112 255.66 112z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Circle cx="256" cy="256" r="80" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </Icon>
);

// 6. arrow-forward
export const ArrowForwardIcon = props => (
  <Icon {...props}>
    <Path d="M268 112l144 144-144 144M392 256H100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" />
  </Icon>
);

// 7. person-outline
export const PersonIcon = props => (
  <Icon {...props}>
    <Path d="M344 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M256 304c-87 0-175.3 48-191.64 138.6C62.39 453.52 68.57 464 80 464h352c11.44 0 17.62-10.48 15.65-21.4C431.3 352 343 304 256 304z" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
  </Icon>
);

// 8. close-circle
export const CloseCircleIcon = props => (
  <Icon {...props}>
    <Path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192zM320 320L192 192M192 320l128-128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </Icon>
);

// 9. checkmark-circle
export const CheckmarkCircleIcon = props => (
  <Icon {...props}>
    <Path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192zM368 192L256 320l-48-48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </Icon>
);

// 10. ellipse-outline
export const EllipseIcon = props => (
  <Icon {...props}>
    <Circle cx="256" cy="256" r="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </Icon>
);

// 11. calendar-outline
export const CalendarIcon = props => (
  <Icon {...props}>
    <Rect x="48" y="80" width="416" height="384" rx="48" ry="48" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="32" />
    <Path fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="32" d="M128 48v32M384 48v32M464 160H48" />
  </Icon>
);

// 12. school-outline
export const SchoolIcon = props => (
  <Icon {...props}>
    <Path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" d="M32 192L256 64l224 128-224 128L32 192z" />
    <Path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" d="M112 240v128l144 80 144-80V240M480 368V192M256 320v128" />
  </Icon>
);

// 13. book-outline
export const BookIcon = props => (
  <Icon {...props}>
    <Path d="M256 160c16-63.16 76.43-95.41 208-96a15.94 15.94 0 0116 16v288a16 16 0 01-16 16c-128 0-177.45 25.81-208 64-30.37-38-80-64-208-64-9.88 0-16-8.05-16-17.93V80a15.94 15.94 0 0116-16c131.57.59 192 32.84 208 96zM256 160v288" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </Icon>
);

// 14. business-outline
export const BusinessIcon = props => (
  <Icon {...props}>
    <Path d="M256 64v352M128 256v160M384 256v160" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Rect x="128" y="160" width="256" height="256" rx="40" ry="40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M128 320h256M128 256h256" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </Icon>
);

// 15. library-outline
export const LibraryIcon = props => (
  <Icon {...props}>
    <Rect x="32" y="96" width="64" height="368" rx="16" ry="16" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M112 224L240 96l176 176-128 128M144 256l128-128M256 368l128-128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M480 304l-64 64-112-112M384 464V368" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </Icon>
);

// 16. time-outline
export const TimeIcon = props => (
  <Icon {...props}>
    <Path d="M256 64C150 64 64 150 64 256s86 192 192 192 192-86 192-192S362 64 256 64z" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Path d="M256 128v144l96 64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </Icon>
);

// 17. information-circle-outline
export const InformationCircleIcon = props => (
  <Icon {...props}>
    <Circle cx="256" cy="256" r="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M256 176h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="40" />
    <Path d="M240 240h16v96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </Icon>
);

// 18. flash-outline
export const FlashIcon = props => (
  <Icon {...props}>
    <Path d="M304 48L176 272h96l-32 192 144-240h-96l16-176z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </Icon>
);

// 19. alert-circle-outline
export const AlertCircleIcon = props => (
  <Icon {...props}>
    <Circle cx="256" cy="256" r="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M256 144v136" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M256 368h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="40" />
  </Icon>
);

// 20. checkmark
export const CheckmarkIcon = props => (
  <Icon {...props}>
    <Path d="M112 264l88 88 200-200" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" />
  </Icon>
);

// 21. arrow-back
export const ArrowBackIcon = props => (
  <Icon {...props}>
    <Path d="M244 112L100 256l144 144M120 256h292" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" />
  </Icon>
);

// 22. search-outline
export const SearchIcon = props => (
  <Icon {...props}>
    <Circle cx="232" cy="232" r="120" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M320 320l96 96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </Icon>
);

// 23. list-outline
export const ListIcon = props => (
  <Icon {...props}>
    <Path d="M96 128h320M96 256h320M96 384h320" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </Icon>
);

// 24. chevron-up
export const ChevronUpIcon = props => (
  <Icon {...props}>
    <Path d="M112 320l144-144 144 144" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="44" />
  </Icon>
);

// 25. chevron-down
export const ChevronDownIcon = props => (
  <Icon {...props}>
    <Path d="M112 192l144 144 144-144" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="44" />
  </Icon>
);
