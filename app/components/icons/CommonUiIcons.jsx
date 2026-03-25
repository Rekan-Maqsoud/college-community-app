import React from 'react';
import Svg, { Path, Circle, Polyline, Line } from 'react-native-svg';
import {
  AlertCircleIcon,
  ArrowBackIcon,
  ArrowForwardIcon,
  CheckmarkCircleIcon,
  SearchIcon,
} from './AuthIcons';
import {
  ChatbubblesIcon,
  NotificationsIcon,
  RefreshIcon,
} from './home/HomeIcons';
import { ArchiveOutlineIcon, PeopleOutlineIcon } from './chats/ChatIcons';

const replaceCurrentColor = (children, color) => React.Children.map(children, (child) => {
  if (!React.isValidElement(child)) return child;

  const nextProps = {};
  if (child.props.stroke === 'currentColor') nextProps.stroke = color;
  if (child.props.fill === 'currentColor') nextProps.fill = color;
  if (child.props.children) nextProps.children = replaceCurrentColor(child.props.children, color);

  return React.cloneElement(child, nextProps);
});

const CommonIcon = ({ size = 24, color = '#111827', children, ...props }) => {
  const resolvedChildren = replaceCurrentColor(children, color);

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill={color} {...props}>
      {resolvedChildren}
    </Svg>
  );
};

export const AlertCircleOutlineIcon = AlertCircleIcon;
export const RefreshOutlineIcon = RefreshIcon;
export const ArchiveOutlineSvgIcon = ArchiveOutlineIcon;
export const ArrowBackOutlineIcon = ArrowBackIcon;
export const ArrowForwardOutlineIcon = ArrowForwardIcon;
export const ChatbubblesOutlineIcon = ChatbubblesIcon;
export const SearchOutlineIcon = SearchIcon;
export const NotificationsOutlineIcon = NotificationsIcon;
export const PeopleOutlineSvgIcon = PeopleOutlineIcon;

export const BookmarkOutlineIcon = props => (
  <CommonIcon {...props}>
    <Path
      d="M352 48H160a48 48 0 00-48 48v400l144-112 144 112V96a48 48 0 00-48-48z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="32"
    />
  </CommonIcon>
);

export const PersonAddOutlineIcon = props => (
  <CommonIcon {...props}>
    <Path
      d="M376 144c0 57.35-53.65 104-120 104S136 201.35 136 144 189.65 40 256 40s120 46.65 120 104z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="32"
    />
    <Path
      d="M66 440c0-82.84 84.11-152 190-152"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="32"
    />
    <Circle cx="402" cy="264" r="70" fill="none" stroke="currentColor" strokeWidth="32" />
    <Path d="M402 224v80M442 264h-80" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </CommonIcon>
);

export const LanguageOutlineIcon = props => (
  <CommonIcon {...props}>
    <Path d="M48 112h416M128 48s16 144 128 224M256 272c96-48 128-224 128-224" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M192 448l128-288 128 288M232 352h176" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </CommonIcon>
);

export const StarIcon = props => (
  <CommonIcon {...props}>
    <Path d="M463.27 192H315.9L256 48l-59.9 144H48.73l120.49 96.26L121.83 464 256 368l134.17 96-47.39-175.74L463.27 192z" />
  </CommonIcon>
);

export const TrophyIcon = props => (
  <CommonIcon {...props}>
    <Path d="M464,80H403.9a4,4,0,0,1-4-4c0-4.89,0-9,0-12.08A32,32,0,0,0,367.9,32h0l-223.79.26a32,32,0,0,0-31.94,31.93c0,3.23,0,7.22,0,11.81a4,4,0,0,1-4,4H48A16,16,0,0,0,32,96v16c0,54.53,30,112.45,76.52,125.35a7.82,7.82,0,0,1,5.55,5.9c5.77,26.89,23.52,52.5,51.41,73.61,20.91,15.83,45.85,27.5,68.27,32.48a8,8,0,0,1,6.25,7.8V444a4,4,0,0,1-4,4H176.45c-8.61,0-16,6.62-16.43,15.23A16,16,0,0,0,176,480H335.55c8.61,0,16-6.62,16.43-15.23A16,16,0,0,0,336,448H276a4,4,0,0,1-4-4V357.14a8,8,0,0,1,6.25-7.8c22.42-5,47.36-16.65,68.27-32.48,27.89-21.11,45.64-46.72,51.41-73.61a7.82,7.82,0,0,1,5.55-5.9C450,224.45,480,166.53,480,112V96A16,16,0,0,0,464,80ZM112,198.22a4,4,0,0,1-6,3.45c-10.26-6.11-17.75-15.37-22.14-21.89-11.91-17.69-19-40.67-19.79-63.63a4,4,0,0,1,4-4.15h40a4,4,0,0,1,4,4C112.05,143.45,112,174.87,112,198.22Zm316.13-18.44c-4.39,6.52-11.87,15.78-22.13,21.89a4,4,0,0,1-6-3.46c0-26.51,0-56.63-.05-82.21a4,4,0,0,1,4-4h40a4,4,0,0,1,4,4.15C447.16,139.11,440.05,162.09,428.14,179.78Z" />
  </CommonIcon>
);

export const CloseFilledIcon = props => (
  <CommonIcon {...props}>
    <Path d="M289.94,256l95-95A24,24,0,0,0,351,127l-95,95-95-95A24,24,0,0,0,127,161l95,95-95,95A24,24,0,1,0,161,385l95-95,95,95A24,24,0,0,0,385,351Z" />
  </CommonIcon>
);

export const AlertCircleOutlineExactIcon = props => (
  <CommonIcon {...props}>
    <Path d="M448,256c0-106-86-192-192-192S64,150,64,256s86,192,192,192S448,362,448,256Z" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Path d="M250.26,166.05,256,288l5.73-121.95a5.74,5.74,0,0,0-5.79-6h0A5.74,5.74,0,0,0,250.26,166.05Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M256,367.91a20,20,0,1,1,20-20A20,20,0,0,1,256,367.91Z" />
  </CommonIcon>
);

export const HeartOutlineIcon = props => (
  <CommonIcon {...props}>
    <Path d="M352.92,80C288,80,256,144,256,144s-32-64-96.92-64C106.32,80,64.54,124.14,64,176.81c-1.1,109.33,86.73,187.08,183,252.42a16,16,0,0,0,18,0c96.26-65.34,184.09-143.09,183-252.42C447.46,124.14,405.68,80,352.92,80Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </CommonIcon>
);

export const ChatbubblesOutlineExactIcon = props => (
  <CommonIcon {...props}>
    <Path d="M431,320.6c-1-3.6,1.2-8.6,3.3-12.2a33.68,33.68,0,0,1,2.1-3.1A162,162,0,0,0,464,215c.3-92.2-77.5-167-173.7-167C206.4,48,136.4,105.1,120,180.9a160.7,160.7,0,0,0-3.7,34.2c0,92.3,74.8,169.1,171,169.1,15.3,0,35.9-4.6,47.2-7.7s22.5-7.2,25.4-8.3a26.44,26.44,0,0,1,9.3-1.7,26,26,0,0,1,10.1,2L436,388.6a13.52,13.52,0,0,0,3.9,1,8,8,0,0,0,8-8,12.85,12.85,0,0,0-.5-2.7Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32" />
    <Path d="M66.46,232a146.23,146.23,0,0,0,6.39,152.67c2.31,3.49,3.61,6.19,3.21,8s-11.93,61.87-11.93,61.87a8,8,0,0,0,2.71,7.68A8.17,8.17,0,0,0,72,464a7.26,7.26,0,0,0,2.91-.6l56.21-22a15.7,15.7,0,0,1,12,.2c18.94,7.38,39.88,12,60.83,12A159.21,159.21,0,0,0,284,432.11" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32" />
  </CommonIcon>
);

export const ChevronForwardExactIcon = props => (
  <CommonIcon {...props}>
    <Polyline points="184 112 328 256 184 400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" />
  </CommonIcon>
);

export const LinkOutlineIcon = props => (
  <CommonIcon {...props}>
    <Path d="M208,352H144a96,96,0,0,1,0-192h64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="36" />
    <Path d="M304,160h64a96,96,0,0,1,0,192H304" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="36" />
    <Line x1="163.29" y1="256" x2="350.71" y2="256" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="36" />
  </CommonIcon>
);

export const EllipsisHorizontalFilledIcon = props => (
  <CommonIcon {...props}>
    <Circle cx="256" cy="256" r="48" />
    <Circle cx="416" cy="256" r="48" />
    <Circle cx="96" cy="256" r="48" />
  </CommonIcon>
);

export const CreateOutlineIcon = props => (
  <CommonIcon {...props}>
    <Path d="M384,224V408a40,40,0,0,1-40,40H104a40,40,0,0,1-40-40V168a40,40,0,0,1,40-40H271.48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M459.94,53.25a16.06,16.06,0,0,0-23.22-.56L424.35,65a8,8,0,0,0,0,11.31l11.34,11.32a8,8,0,0,0,11.34,0l12.06-12C465.19,69.54,465.76,59.62,459.94,53.25Z" />
    <Path d="M399.34,90,218.82,270.2a9,9,0,0,0-2.31,3.93L208.16,299a3.91,3.91,0,0,0,4.86,4.86l24.85-8.35a9,9,0,0,0,3.93-2.31L422,112.66A9,9,0,0,0,422,100L412.05,90A9,9,0,0,0,399.34,90Z" />
  </CommonIcon>
);

export const TrashOutlineExactIcon = props => (
  <CommonIcon {...props}>
    <Path d="M112,112l20,320c.95,18.49,14.4,32,32,32H348c17.67,0,30.87-13.51,32-32l20-320" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="80" y1="112" x2="432" y2="112" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32" />
    <Path d="M192,112V72h0a23.93,23.93,0,0,1,24-24h80a23.93,23.93,0,0,1,24,24h0v40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="256" y1="176" x2="256" y2="400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="184" y1="176" x2="192" y2="400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="328" y1="176" x2="320" y2="400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </CommonIcon>
);

export const ArrowUpExactIcon = props => (
  <CommonIcon {...props}>
    <Polyline points="112 244 256 100 400 244" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" />
    <Line x1="256" y1="120" x2="256" y2="412" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" />
  </CommonIcon>
);

export const ArrowDownExactIcon = props => (
  <CommonIcon {...props}>
    <Polyline points="112 268 256 412 400 268" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" />
    <Line x1="256" y1="392" x2="256" y2="100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" />
  </CommonIcon>
);

export const CloseCircleOutlineExactIcon = props => (
  <CommonIcon {...props}>
    <Path d="M448,256c0-106-86-192-192-192S64,150,64,256s86,192,192,192S448,362,448,256Z" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Line x1="320" y1="320" x2="192" y2="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="192" y1="320" x2="320" y2="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </CommonIcon>
);

export const CheckmarkCircleOutlineExactIcon = props => (
  <CommonIcon {...props}>
    <Path d="M448,256c0-106-86-192-192-192S64,150,64,256s86,192,192,192S448,362,448,256Z" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Polyline points="352 176 217.6 336 160 272" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </CommonIcon>
);

export const SendFilledIcon = props => (
  <CommonIcon {...props}>
    <Path d="M476.59,227.05l-.16-.07L49.35,49.84A23.56,23.56,0,0,0,27.14,52,24.65,24.65,0,0,0,16,72.59V185.88a24,24,0,0,0,19.52,23.57l232.93,43.07a4,4,0,0,1,0,7.86L35.53,303.45A24,24,0,0,0,16,327V440.31A23.57,23.57,0,0,0,26.59,460a23.94,23.94,0,0,0,13.22,4,24.55,24.55,0,0,0,9.52-1.93L476.4,285.94l.19-.09a32,32,0,0,0,0-58.8Z" />
  </CommonIcon>
);

export const NewspaperOutlineExactIcon = props => (
  <CommonIcon {...props}>
    <Path d="M368,415.86V72a24.07,24.07,0,0,0-24-24H72A24.07,24.07,0,0,0,48,72V424a40.12,40.12,0,0,0,40,40H416" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M416,464h0a48,48,0,0,1-48-48V128h72a24,24,0,0,1,24,24V416A48,48,0,0,1,416,464Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="240" y1="128" x2="304" y2="128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="240" y1="192" x2="304" y2="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="112" y1="256" x2="304" y2="256" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="112" y1="320" x2="304" y2="320" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="112" y1="384" x2="304" y2="384" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M176,208H112a16,16,0,0,1-16-16V128a16,16,0,0,1,16-16h64a16,16,0,0,1,16,16v64A16,16,0,0,1,176,208Z" />
  </CommonIcon>
);

export const SearchFilledExactIcon = props => (
  <CommonIcon {...props}>
    <Path d="M456.69,421.39,362.6,327.3a173.81,173.81,0,0,0,34.84-104.58C397.44,126.38,319.06,48,222.72,48S48,126.38,48,222.72s78.38,174.72,174.72,174.72A173.81,173.81,0,0,0,327.3,362.6l94.09,94.09a25,25,0,0,0,35.3-35.3ZM97.92,222.72a124.8,124.8,0,1,1,124.8,124.8A124.95,124.95,0,0,1,97.92,222.72Z" />
  </CommonIcon>
);

export const ShareOutlineExactIcon = props => (
  <CommonIcon {...props}>
    <Path d="M336,192h40a40,40,0,0,1,40,40V424a40,40,0,0,1-40,40H136a40,40,0,0,1-40-40V232a40,40,0,0,1,40-40h40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Polyline points="336 128 256 48 176 128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="256" y1="321" x2="256" y2="48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </CommonIcon>
);

export const DownloadOutlineExactIcon = props => (
  <CommonIcon {...props}>
    <Path d="M336,176h40a40,40,0,0,1,40,40V424a40,40,0,0,1-40,40H136a40,40,0,0,1-40-40V216a40,40,0,0,1,40-40h40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Polyline points="176 272 256 352 336 272" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="256" y1="48" x2="256" y2="336" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </CommonIcon>
);

export const CheckmarkCircleFilledIcon = props => (
  <CommonIcon {...props}>
    <Path d="M256,48C141.31,48,48,141.31,48,256s93.31,208,208,208,208-93.31,208-208S370.69,48,256,48ZM364.25,186.29l-134.4,160a16,16,0,0,1-12,5.71h-.27a16,16,0,0,1-11.89-5.3l-57.6-64a16,16,0,1,1,23.78-21.4l45.29,50.32L339.75,165.71a16,16,0,0,1,24.5,20.58Z" />
  </CommonIcon>
);

export const CloseCircleFilledIcon = props => (
  <CommonIcon {...props}>
    <Path d="M256,48C141.31,48,48,141.31,48,256s93.31,208,208,208,208-93.31,208-208S370.69,48,256,48Zm75.31,260.69a16,16,0,1,1-22.62,22.62L256,278.63l-52.69,52.68a16,16,0,0,1-22.62-22.62L233.37,256l-52.68-52.69a16,16,0,0,1,22.62-22.62L256,233.37l52.69-52.68a16,16,0,0,1,22.62,22.62L278.63,256Z" />
  </CommonIcon>
);

export const WarningFilledIcon = props => (
  <CommonIcon {...props}>
    <Path d="M449.07,399.08,278.64,82.58c-12.08-22.44-44.26-22.44-56.35,0L51.87,399.08A32,32,0,0,0,80,446.25H420.89A32,32,0,0,0,449.07,399.08Zm-198.6-1.83a20,20,0,1,1,20-20A20,20,0,0,1,250.47,397.25ZM272.19,196.1l-5.74,122a16,16,0,0,1-32,0l-5.74-121.95v0a21.73,21.73,0,0,1,21.5-22.69h.21a21.74,21.74,0,0,1,21.73,22.7Z" />
  </CommonIcon>
);

export const InformationCircleFilledIcon = props => (
  <CommonIcon {...props}>
    <Path d="M256,56C145.72,56,56,145.72,56,256s89.72,200,200,200,200-89.72,200-200S366.28,56,256,56Zm0,82a26,26,0,1,1-26,26A26,26,0,0,1,256,138Zm48,226H216a16,16,0,0,1,0-32h28V244H228a16,16,0,0,1,0-32h32a16,16,0,0,1,16,16V332h28a16,16,0,0,1,0,32Z" />
  </CommonIcon>
);

export { CheckmarkCircleIcon };
