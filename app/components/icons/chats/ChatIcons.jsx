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

const ChatIconBase = ({ size = 24, color = '#111827', children, ...props }) => {
  const resolvedChildren = replaceCurrentColor(children, color);
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill={color} {...props}>
      {resolvedChildren}
    </Svg>
  );
};

export const ArchiveOutlineIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M80,152V408a40.12,40.12,0,0,0,40,40H392a40.12,40.12,0,0,0,40-40V152" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Rect x="48" y="64" width="416" height="80" rx="28" ry="28" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M320 304L256 368 192 304" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M256 345.89V224" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </ChatIconBase>
);

export const SchoolChatIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M32 192L256 64l224 128-224 128L32 192z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M112 240v128l144 80 144-80V240" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </ChatIconBase>
);

export const PeopleChatIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M336,256c-20.56,0-40.44-9.18-56-25.84-15.13-16.25-24.37-37.92-26-61-1.74-24.62,5.77-47.26,21.14-63.76S312,80,336,80c23.83,0,45.38,9.06,60.7,25.52,15.47,16.62,23,39.22,21.26,63.63h0c-1.67,23.11-10.9,44.77-26,61C376.44,246.82,356.57,256,336,256Z" />
    <Path d="M467.83,432H204.18a27.71,27.71,0,0,1-22-10.67,30.22,30.22,0,0,1-5.26-25.79c8.42-33.81,29.28-61.85,60.32-81.08C264.79,297.4,299.86,288,336,288c36.85,0,71,9,98.71,26.05,31.11,19.13,52,47.33,60.38,81.55a30.27,30.27,0,0,1-5.32,25.78A27.68,27.68,0,0,1,467.83,432Z" />
    <Path d="M147,260c-35.19,0-66.13-32.72-69-72.93C76.58,166.47,83,147.42,96,133.45,108.86,119.62,127,112,147,112s38,7.66,50.93,21.57c13.1,14.08,19.5,33.09,18,53.52C213.06,227.29,182.13,260,147,260Z" />
    <Path d="M212.66,291.45c-17.59-8.6-40.42-12.9-65.65-12.9-29.46,0-58.07,7.68-80.57,21.62C40.93,316,23.77,339.05,16.84,366.88a27.39,27.39,0,0,0,4.79,23.36A25.32,25.32,0,0,0,41.72,400h111a8,8,0,0,0,7.87-6.57c.11-.63.25-1.26.41-1.88,8.48-34.06,28.35-62.84,57.71-83.82a8,8,0,0,0-.63-13.39C216.51,293.42,214.71,292.45,212.66,291.45Z" />
  </ChatIconBase>
);

export const PeopleOutlineIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M402,168c-2.93,40.67-33.1,72-66,72s-63.12-31.32-66-72c-3-42.31,26.37-72,66-72S405,126.46,402,168Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M336,304c-65.17,0-127.84,32.37-143.54,95.41-2.08,8.34,3.15,16.59,11.72,16.59H467.83c8.57,0,13.77-8.25,11.72-16.59C463.85,335.36,401.18,304,336,304Z" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Path d="M200,185.94C197.66,218.42,173.28,244,147,244S96.3,218.43,94,185.94C91.61,152.15,115.34,128,147,128S202.39,152.77,200,185.94Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M206,306c-18.05-8.27-37.93-11.45-59-11.45-52,0-102.1,25.85-114.65,76.2C30.7,377.41,34.88,384,41.72,384H154" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32" />
  </ChatIconBase>
);

export const ChatbubbleIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M76.83,480a25.69,25.69,0,0,1-25.57-25.74,29.13,29.13,0,0,1,1.2-7.63L70.88,380c.77-2.46-.1-4.94-1.23-6.9l-.22-.4c-.08-.13-.46-.66-.73-1.05s-.58-.81-.86-1.22l-.19-.27A215.66,215.66,0,0,1,32,251.37c-.18-57.59,22.35-112,63.46-153.28C138,55.47,194.9,32,255.82,32A227.4,227.4,0,0,1,398,81.84c39.45,31.75,66.87,76,77.21,124.68a213.5,213.5,0,0,1,4.78,45c0,58.93-22.64,114.28-63.76,155.87-41.48,42-97.18,65.06-156.83,65.06-21,0-47.87-5.36-60.77-9-15.52-4.34-30.23-10-31.85-10.6a15.12,15.12,0,0,0-5.37-1,14.75,14.75,0,0,0-5.8,1.15l-.85.33L87.28,477.71A29.44,29.44,0,0,1,76.83,480Z" />
  </ChatIconBase>
);

export const ArrowBackIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M244 112L100 256l144 144M120 256h292" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" />
  </ChatIconBase>
);

export const ArrowForwardIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M268 112l144 144-144 144M392 256H100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" />
  </ChatIconBase>
);

export const SearchIcon = props => (
  <ChatIconBase {...props}>
    <Circle cx="232" cy="232" r="120" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M320 320l96 96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </ChatIconBase>
);

export const AddIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M256 112v288M112 256h288" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="40" />
  </ChatIconBase>
);

export const PersonOutlineIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M344,144c-3.92,52.87-44,96-88,96s-84.15-43.12-88-96c-4-55,35-96,88-96S348,90,344,144Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M256,304c-87,0-175.3,48-191.64,138.6C62.39,453.52,68.57,464,80,464H432c11.44,0,17.62-10.48,15.65-21.4C431.3,352,343,304,256,304Z" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
  </ChatIconBase>
);

export const PersonIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M332.64,64.58C313.18,43.57,286,32,256,32c-30.16,0-57.43,11.5-76.8,32.38-19.58,21.11-29.12,49.8-26.88,80.78C156.76,206.28,203.27,256,256,256s99.16-49.71,103.67-110.82C361.94,114.48,352.34,85.85,332.64,64.58Z" />
    <Path d="M432,480H80A31,31,0,0,1,55.8,468.87c-6.5-7.77-9.12-18.38-7.18-29.11C57.06,392.94,83.4,353.61,124.8,326c36.78-24.51,83.37-38,131.2-38s94.42,13.5,131.2,38c41.4,27.6,67.74,66.93,76.18,113.75,1.94,10.73-.68,21.34-7.18,29.11A31,31,0,0,1,432,480Z" />
  </ChatIconBase>
);

export const SettingsOutlineIcon = props => (
  <ChatIconBase {...props}>
    <Circle cx="256" cy="256" r="72" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M457 256l-42-24 4-48-48-8-24-42-45 18-46-18-24 42-48 8 4 48-42 24 42 24-4 48 48 8 24 42 46-18 45 18 24-42 48-8-4-48 42-24z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="20" />
  </ChatIconBase>
);

export const NotificationsOutlineIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M448 384c-16-16-32-32-32-112V208c0-88.22-56.94-147.08-144-159.66V16a16 16 0 00-32 0v32.34C152.94 60.92 96 119.78 96 208v64c0 80-16 96-32 112h384z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M304 384a48 48 0 01-96 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </ChatIconBase>
);

export const NotificationsOffOutlineIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M432 432L80 80" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M448 384c-16-16-32-32-32-112V208c0-49.56-18.12-89.64-49.74-118.57M96 208v64c0 80-16 96-32 112h384" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M304 384a48 48 0 01-96 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </ChatIconBase>
);

export const TrashOutlineIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M112 144h288M192 144V96h128v48M160 144l16 288h160l16-288" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </ChatIconBase>
);

export const TrashIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M112 144h288M160 144l16 288h160l16-288" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M208 208v176M256 208v176M304 208v176" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
  </ChatIconBase>
);

export const ExitOutlineIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M320 176l96 80-96 80M176 256h224" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="36" />
    <Path d="M208 432H112a48 48 0 01-48-48V128a48 48 0 0148-48h96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </ChatIconBase>
);

export const TimeOutlineIcon = props => (
  <ChatIconBase {...props}>
    <Circle cx="256" cy="256" r="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M256 128v144l96 64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </ChatIconBase>
);

export const TodayOutlineIcon = props => (
  <ChatIconBase {...props}>
    <Rect x="64" y="96" width="384" height="320" rx="48" ry="48" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M144 64v64M368 64v64M448 192H64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Rect x="206" y="250" width="100" height="86" rx="10" ry="10" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="28" />
  </ChatIconBase>
);

export const CalendarOutlineIcon = props => (
  <ChatIconBase {...props}>
    <Rect x="48" y="80" width="416" height="384" rx="48" ry="48" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M128 48v32M384 48v32M464 160H48" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="32" />
  </ChatIconBase>
);

export const ShieldCheckmarkIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M256 48l176 64v128c0 112-77 190-176 224C157 430 80 352 80 240V112l176-64z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
    <Path d="M192 264l44 44 84-96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </ChatIconBase>
);

export const ChevronForwardIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M184 112l144 144-144 144" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="40" />
  </ChatIconBase>
);

export const BusinessChatIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M432,176H320V64a48,48,0,0,0-48-48H80A48,48,0,0,0,32,64V480a16,16,0,0,0,16,16H152a8,8,0,0,0,8-8V416.45c0-8.61,6.62-16,15.23-16.43A16,16,0,0,1,192,416v72a8,8,0,0,0,8,8H464a16,16,0,0,0,16-16V224A48,48,0,0,0,432,176ZM98.08,431.87a16,16,0,1,1,13.79-13.79A16,16,0,0,1,98.08,431.87Zm0-80a16,16,0,1,1,13.79-13.79A16,16,0,0,1,98.08,351.87Zm0-80a16,16,0,1,1,13.79-13.79A16,16,0,0,1,98.08,271.87Zm0-80a16,16,0,1,1,13.79-13.79A16,16,0,0,1,98.08,191.87Zm0-80a16,16,0,1,1,13.79-13.79A16,16,0,0,1,98.08,111.87Zm80,240a16,16,0,1,1,13.79-13.79A16,16,0,0,1,178.08,351.87Zm0-80a16,16,0,1,1,13.79-13.79A16,16,0,0,1,178.08,271.87Zm0-80a16,16,0,1,1,13.79-13.79A16,16,0,0,1,178.08,191.87Zm0-80a16,16,0,1,1,13.79-13.79A16,16,0,0,1,178.08,111.87Zm80,320a16,16,0,1,1,13.79-13.79A16,16,0,0,1,258.08,431.87Zm0-80a16,16,0,1,1,13.79-13.79A16,16,0,0,1,258.08,351.87Zm0-80a16,16,0,1,1,13.79-13.79A16,16,0,0,1,258.08,271.87Zm0-80a16,16,0,1,1,13.79-13.79A16,16,0,0,1,258.08,191.87Zm0-80a16,16,0,1,1,13.79-13.79A16,16,0,0,1,258.08,111.87ZM444,464H320V208H432a16,16,0,0,1,16,16V460A4,4,0,0,1,444,464Z" />
    <Path d="M400,400a16,16,0,1,0,16,16,16,16,0,0,0-16-16Z" />
    <Path d="M400,320a16,16,0,1,0,16,16,16,16,0,0,0-16-16Z" />
    <Path d="M400,240a16,16,0,1,0,16,16,16,16,0,0,0-16-16Z" />
    <Path d="M336,400a16,16,0,1,0,16,16,16,16,0,0,0-16-16Z" />
    <Path d="M336,320a16,16,0,1,0,16,16,16,16,0,0,0-16-16Z" />
    <Path d="M336,240a16,16,0,1,0,16,16,16,16,0,0,0-16-16Z" />
  </ChatIconBase>
);

export const PeopleCircleIcon = props => (
  <ChatIconBase {...props}>
    <Circle cx="256" cy="256" r="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Circle cx="256" cy="220" r="56" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
    <Path d="M144 360c24-38 64-60 112-60s88 22 112 60" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
  </ChatIconBase>
);

export const HandLeftOutlineIcon = props => (
  <ChatIconBase {...props}>
    <Path d="M160 304V144a24 24 0 0148 0v128M208 272V128a24 24 0 0148 0v144M256 272V160a24 24 0 0148 0v112M304 272v-64a24 24 0 0148 0v152c0 48-32 88-80 104l-40 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="28" />
  </ChatIconBase>
);

export const BanIcon = props => (
  <ChatIconBase {...props}>
    <Circle cx="256" cy="256" r="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M392 120L120 392" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </ChatIconBase>
);
