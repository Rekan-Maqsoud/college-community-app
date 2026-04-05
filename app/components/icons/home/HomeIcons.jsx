import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const replaceCurrentColor = (children, color) => React.Children.map(children, (child) => {
  if (!React.isValidElement(child)) return child;

  const nextProps = {};
  if (child.props.stroke === 'currentColor') nextProps.stroke = color;
  if (child.props.fill === 'currentColor') nextProps.fill = color;
  if (child.props.children) nextProps.children = replaceCurrentColor(child.props.children, color);

  return React.cloneElement(child, nextProps);
});

const HomeIcon = ({ size = 24, color = '#111827', children, ...props }) => {
  const resolvedChildren = replaceCurrentColor(children, color);
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill={color} {...props}>
      {resolvedChildren}
    </Svg>
  );
};

export const OptionsIcon = props => (
  <HomeIcon {...props}>
    <Path d="M32 144h448M96 256h320M160 368h192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </HomeIcon>
);

export const NotificationsIcon = props => (
  <HomeIcon {...props}>
    <Path d="M448 384c-16-16-32-32-32-112V208c0-88.22-56.94-147.08-144-159.66V16a16 16 0 00-32 0v32.34C152.94 60.92 96 119.78 96 208v64c0 80-16 96-32 112h384z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M304 384a48 48 0 01-96 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </HomeIcon>
);

export const CloseIcon = props => (
  <HomeIcon {...props}>
    <Path d="M368 368L144 144M368 144L144 368" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="40" />
  </HomeIcon>
);

export const ArrowUpIcon = props => (
  <HomeIcon {...props}>
    <Path d="M256 112v288M144 224l112-112 112 112" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="40" />
  </HomeIcon>
);

export const PeopleIcon = props => (
  <HomeIcon {...props}>
    <Path d="M402,168c-2.93,40.67-33.1,72-66,72s-63.12-31.32-66-72c-3-42.31,26.37-72,66-72S405,126.46,402,168Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M336,304c-65.17,0-127.84,32.37-143.54,95.41-2.08,8.34,3.15,16.59,11.72,16.59H467.83c8.57,0,13.77-8.25,11.72-16.59C463.85,335.36,401.18,304,336,304Z" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Path d="M200,185.94C197.66,218.42,173.28,244,147,244S96.3,218.43,94,185.94C91.61,152.15,115.34,128,147,128S202.39,152.77,200,185.94Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M206,306c-18.05-8.27-37.93-11.45-59-11.45-52,0-102.1,25.85-114.65,76.2C30.7,377.41,34.88,384,41.72,384H154" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32" />
  </HomeIcon>
);

export const SchoolHomeIcon = props => (
  <HomeIcon {...props}>
    <Path d="M32 192L256 64l224 128-224 128L32 192z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M112 240v128l144 80 144-80V240" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </HomeIcon>
);

export const GlobeIcon = props => (
  <HomeIcon {...props}>
    <Circle cx="256" cy="256" r="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M64 256h384M256 64c48 56 80 120 80 192s-32 136-80 192c-48-56-80-120-80-192s32-136 80-192z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </HomeIcon>
);

export const RefreshIcon = props => (
  <HomeIcon {...props}>
    <Path d="M320,146s24.36-12-64-12A160,160,0,1,0,416,294" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32" />
    <Path d="M256 58L336 138 256 218" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </HomeIcon>
);

export const MedkitIcon = props => (
  <HomeIcon {...props}>
    <Rect x="96" y="144" width="320" height="288" rx="56" ry="56" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M192 144v-16a48 48 0 0148-48h32a48 48 0 0148 48v16M256 224v128M192 288h128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </HomeIcon>
);

export const WarningIcon = props => (
  <HomeIcon {...props}>
    <Path d="M256 64l208 368H48L256 64z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M256 192v112M256 360h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="36" />
  </HomeIcon>
);

export const BanIcon = props => (
  <HomeIcon {...props}>
    <Circle cx="256" cy="256" r="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M392 120L120 392" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </HomeIcon>
);

export const HandLeftIcon = props => (
  <HomeIcon {...props}>
    <Path d="M160 304V144a24 24 0 0148 0v128M208 272V128a24 24 0 0148 0v144M256 272V160a24 24 0 0148 0v112M304 272v-64a24 24 0 0148 0v152c0 48-32 88-80 104l-40 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
  </HomeIcon>
);

export const AlertCircleHomeIcon = props => (
  <HomeIcon {...props}>
    <Circle cx="256" cy="256" r="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M256 144v136M256 368h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="36" />
  </HomeIcon>
);

export const DocumentTextIcon = props => (
  <HomeIcon {...props}>
    <Path d="M368 48H176a48 48 0 00-48 48v320a48 48 0 0048 48h240a48 48 0 0048-48V144L368 48z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M368 48v96h96M208 224h160M208 288h160M208 352h96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
  </HomeIcon>
);

export const EyeOffHomeIcon = props => (
  <HomeIcon {...props}>
    <Path d="M432 432L80 80M255.66 112c-77.94 0-157.89 45.11-220.83 135.33a16 16 0 00-.27 17.77C82.92 340.8 161.8 400 255.66 400c92.84 0 173.34-59.38 221.79-135.25a16.14 16.14 0 000-17.47C428.89 172.28 347.8 112 255.66 112z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Circle cx="256" cy="256" r="80" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </HomeIcon>
);

export const MailUnreadIcon = props => (
  <HomeIcon {...props}>
    <Rect x="48" y="96" width="416" height="320" rx="40" ry="40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M112 160l144 112 144-112" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Circle cx="392" cy="128" r="28" fill="currentColor" />
  </HomeIcon>
);

export const EllipsisHorizontalCircleIcon = props => (
  <HomeIcon {...props}>
    <Circle cx="256" cy="256" r="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Circle cx="184" cy="256" r="20" fill="currentColor" />
    <Circle cx="256" cy="256" r="20" fill="currentColor" />
    <Circle cx="328" cy="256" r="20" fill="currentColor" />
  </HomeIcon>
);

export const ChatbubbleEllipsesIcon = props => (
  <HomeIcon {...props}>
    <Path d="M80 96h352a48 48 0 0148 48v192a48 48 0 01-48 48H208l-96 64v-64H80a48 48 0 01-48-48V144a48 48 0 0148-48z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
    <Circle cx="176" cy="240" r="16" fill="currentColor" />
    <Circle cx="256" cy="240" r="16" fill="currentColor" />
    <Circle cx="336" cy="240" r="16" fill="currentColor" />
  </HomeIcon>
);

export const RibbonIcon = props => (
  <HomeIcon {...props}>
    <Path d="M256 48a112 112 0 100 224 112 112 0 000-224z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M204 256l-28 192 80-52 80 52-28-192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
  </HomeIcon>
);

export const HourglassIcon = props => (
  <HomeIcon {...props}>
    <Path d="M160 64h192M160 448h192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M176 64c0 96 64 112 80 128-16 16-80 32-80 128M336 64c0 96-64 112-80 128 16 16 80 32 80 128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
  </HomeIcon>
);

export const FlameIcon = props => (
  <HomeIcon {...props}>
    <Path d="M304 64c8 56-8 96-40 136-20-24-36-52-40-88-64 56-112 128-112 208 0 89.5 68.5 160 144 160s144-70.5 144-160c0-104-60-176-96-256z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
    <Path d="M256 288c-28 24-48 52-48 88a64 64 0 00128 0c0-36-24-64-48-88-6 14-16 28-32 40z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
  </HomeIcon>
);

export const AppsIcon = props => (
  <HomeIcon {...props}>
    <Rect x="80" y="80" width="144" height="144" rx="20" ry="20" fill="none" stroke="currentColor" strokeWidth="28" />
    <Rect x="288" y="80" width="144" height="144" rx="20" ry="20" fill="none" stroke="currentColor" strokeWidth="28" />
    <Rect x="80" y="288" width="144" height="144" rx="20" ry="20" fill="none" stroke="currentColor" strokeWidth="28" />
    <Rect x="288" y="288" width="144" height="144" rx="20" ry="20" fill="none" stroke="currentColor" strokeWidth="28" />
  </HomeIcon>
);

export const HelpCircleIcon = props => (
  <HomeIcon {...props}>
    <Circle cx="256" cy="256" r="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M208 208a48 48 0 1192 20c-6 18-20 30-36 40-14 8-24 18-24 36" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
    <Path d="M256 368h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="40" />
  </HomeIcon>
);

export const ChatbubblesIcon = props => (
  <HomeIcon {...props}>
    <Path d="M96 112h208a48 48 0 0148 48v120a48 48 0 01-48 48H184l-72 48v-48H96a48 48 0 01-48-48V160a48 48 0 0148-48z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
    <Path d="M256 192h144a48 48 0 0148 48v104a48 48 0 01-48 48h-24v40l-64-40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
  </HomeIcon>
);

export const MegaphoneIcon = props => (
  <HomeIcon {...props}>
    <Path d="M80 272h96l176 80V160l-176 80H80v32z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
    <Path d="M176 272l24 112h56l-16-96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
  </HomeIcon>
);

export const BarChartIcon = props => (
  <HomeIcon {...props}>
    <Path d="M80 432h352" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
    <Rect x="112" y="272" width="64" height="144" rx="10" ry="10" fill="none" stroke="currentColor" strokeWidth="24" />
    <Rect x="224" y="208" width="64" height="208" rx="10" ry="10" fill="none" stroke="currentColor" strokeWidth="24" />
    <Rect x="336" y="144" width="64" height="272" rx="10" ry="10" fill="none" stroke="currentColor" strokeWidth="24" />
  </HomeIcon>
);

export const CheckmarkIcon = props => (
  <HomeIcon {...props}>
    <Path d="M112 264l88 88 200-200" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" />
  </HomeIcon>
);

export const CloseOutlineIcon = props => (
  <HomeIcon {...props}>
    <Path d="M368 368L144 144M368 144L144 368" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="40" />
  </HomeIcon>
);
