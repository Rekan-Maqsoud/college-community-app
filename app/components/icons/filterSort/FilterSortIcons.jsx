import React from 'react';
import Svg, { Path, Line, Rect, Circle, Polygon, Polyline } from 'react-native-svg';

const replaceCurrentColor = (children, color) => React.Children.map(children, (child) => {
  if (!React.isValidElement(child)) return child;

  const nextProps = {};
  if (child.props.stroke === 'currentColor') nextProps.stroke = color;
  if (child.props.fill === 'currentColor') nextProps.fill = color;
  if (child.props.children) nextProps.children = replaceCurrentColor(child.props.children, color);

  return React.cloneElement(child, nextProps);
});

const FilterSortIconBase = ({ size = 24, color = '#111827', children, ...props }) => {
  const resolvedChildren = replaceCurrentColor(children, color);
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill={color} {...props}>
      {resolvedChildren}
    </Svg>
  );
};

export const SchoolOutlineFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Polygon points="32 192 256 64 480 192 256 320 32 192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Polyline points="112 240 112 368 256 448 400 368 400 240" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="480" y1="368" x2="480" y2="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="256" y1="320" x2="256" y2="448" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </FilterSortIconBase>
);

export const RibbonOutlineFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Circle cx="256" cy="160" r="128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M143.65,227.82,48,400l86.86-.42a16,16,0,0,1,13.82,7.8L192,480l88.33-194.32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M366.54,224,464,400l-86.86-.42a16,16,0,0,0-13.82,7.8L320,480,256,339.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Circle cx="256" cy="160" r="64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </FilterSortIconBase>
);

export const TimeOutlineFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Path d="M256,64C150,64,64,150,64,256s86,192,192,192,192-86,192-192S362,64,256,64Z" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Polyline points="256 128 256 272 352 272" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </FilterSortIconBase>
);

export const HourglassOutlineFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Path d="M145.61,464H366.39c19.8,0,35.55-16.29,33.42-35.06C386.06,308,304,310,304,256s83.11-51,95.8-172.94c2-18.78-13.61-35.06-33.41-35.06H145.61c-19.8,0-35.37,16.28-33.41,35.06C124.89,205,208,201,208,256s-82.06,52-95.8,172.94C110.06,447.71,125.81,464,145.61,464Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M343.3,432H169.13c-15.6,0-20-18-9.06-29.16C186.55,376,240,356.78,240,326V224c0-19.85-38-35-61.51-67.2-3.88-5.31-3.49-12.8,6.37-12.8H327.59c8.41,0,10.23,7.43,6.4,12.75C310.82,189,272,204.05,272,224V326c0,30.53,55.71,47,80.4,76.87C362.35,414.91,358.87,432,343.3,432Z" />
  </FilterSortIconBase>
);

export const FlameOutlineFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Path d="M112,320c0-93,124-165,96-272,66,0,192,96,192,272a144,144,0,0,1-288,0Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M320,368c0,57.71-32,80-64,80s-64-22.29-64-80,40-86,32-128C266,240,320,310.29,320,368Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </FilterSortIconBase>
);

export const AppsOutlineFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Rect x="64" y="64" width="80" height="80" rx="40" ry="40" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Rect x="216" y="64" width="80" height="80" rx="40" ry="40" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Rect x="368" y="64" width="80" height="80" rx="40" ry="40" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Rect x="64" y="216" width="80" height="80" rx="40" ry="40" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Rect x="216" y="216" width="80" height="80" rx="40" ry="40" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Rect x="368" y="216" width="80" height="80" rx="40" ry="40" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Rect x="64" y="368" width="80" height="80" rx="40" ry="40" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Rect x="216" y="368" width="80" height="80" rx="40" ry="40" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Rect x="368" y="368" width="80" height="80" rx="40" ry="40" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
  </FilterSortIconBase>
);

export const HelpCircleOutlineFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Path d="M256,80A176,176,0,1,0,432,256,176,176,0,0,0,256,80Z" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Path d="M200,202.29s.84-17.5,19.57-32.57C230.68,160.77,244,158.18,256,158c10.93-.14,20.69,1.67,26.53,4.45,10,4.76,29.47,16.38,29.47,41.09,0,26-17,37.81-36.37,50.8S251,281.43,251,296" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="28" />
    <Circle cx="250" cy="348" r="20" />
  </FilterSortIconBase>
);

export const HelpCircleFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Path d="M256,64C150,64,64,150,64,256s86,192,192,192,192-86,192-192S362,64,256,64Zm-6,304a20,20,0,1,1,20-20A20,20,0,0,1,250,368Zm33.44-102C267.23,276.88,265,286.85,265,296a14,14,0,0,1-28,0c0-21.91,10.08-39.33,30.82-53.26C287.1,229.8,298,221.6,298,203.57c0-12.26-7-21.57-21.49-28.46-3.41-1.62-11-3.2-20.34-3.09-11.72.15-20.82,2.95-27.83,8.59C215.12,191.25,214,202.83,214,203a14,14,0,1,1-28-1.35c.11-2.43,1.8-24.32,24.77-42.8,11.91-9.58,27.06-14.56,45-14.78,12.7-.15,24.63,2,32.72,5.82C312.7,161.34,326,180.43,326,203.57,326,237.4,303.39,252.59,283.44,266Z" />
  </FilterSortIconBase>
);

export const ChatbubblesOutlineFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Path d="M431,320.6c-1-3.6,1.2-8.6,3.3-12.2a33.68,33.68,0,0,1,2.1-3.1A162,162,0,0,0,464,215c.3-92.2-77.5-167-173.7-167C206.4,48,136.4,105.1,120,180.9a160.7,160.7,0,0,0-3.7,34.2c0,92.3,74.8,169.1,171,169.1,15.3,0,35.9-4.6,47.2-7.7s22.5-7.2,25.4-8.3a26.44,26.44,0,0,1,9.3-1.7,26,26,0,0,1,10.1,2L436,388.6a13.52,13.52,0,0,0,3.9,1,8,8,0,0,0,8-8,12.85,12.85,0,0,0-.5-2.7Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32" />
    <Path d="M66.46,232a146.23,146.23,0,0,0,6.39,152.67c2.31,3.49,3.61,6.19,3.21,8s-11.93,61.87-11.93,61.87a8,8,0,0,0,2.71,7.68A8.17,8.17,0,0,0,72,464a7.26,7.26,0,0,0,2.91-.6l56.21-22a15.7,15.7,0,0,1,12,.2c18.94,7.38,39.88,12,60.83,12A159.21,159.21,0,0,0,284,432.11" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32" />
  </FilterSortIconBase>
);

export const DocumentTextOutlineFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Path d="M416,221.25V416a48,48,0,0,1-48,48H144a48,48,0,0,1-48-48V96a48,48,0,0,1,48-48h98.75a32,32,0,0,1,22.62,9.37L406.63,198.63A32,32,0,0,1,416,221.25Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M256,56V176a32,32,0,0,0,32,32H408" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="176" y1="288" x2="336" y2="288" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="176" y1="368" x2="336" y2="368" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </FilterSortIconBase>
);

export const MegaphoneOutlineFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Path d="M407.94,52.22S321.3,160,240,160H80a16,16,0,0,0-16,16v96a16,16,0,0,0,16,16H240c81.3,0,167.94,108.23,167.94,108.23,6.06,8,24.06,2.52,24.06-9.83V62C432,49.69,415,43.18,407.94,52.22Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M64,256s-16-6-16-32,16-32,16-32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M448,246s16-4.33,16-22-16-22-16-22" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="256" y1="160" x2="256" y2="288" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="112" y1="160" x2="112" y2="288" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Path d="M144,288V456a8,8,0,0,0,8,8h53a16,16,0,0,0,15.29-20.73C211.91,416.39,192,386.08,192,336h16a16,16,0,0,0,16-16V304a16,16,0,0,0-16-16H192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </FilterSortIconBase>
);

export const BarChartOutlineFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Path d="M32,32V464a16,16,0,0,0,16,16H480" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Rect x="96" y="224" width="80" height="192" rx="20" ry="20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Rect x="240" y="176" width="80" height="240" rx="20" ry="20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Rect x="383.64" y="112" width="80" height="304" rx="20" ry="20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </FilterSortIconBase>
);

export const CheckmarkCircleOutlineFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Path d="M448,256c0-106-86-192-192-192S64,150,64,256s86,192,192,192S448,362,448,256Z" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
    <Polyline points="352 176 217.6 336 160 272" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </FilterSortIconBase>
);

export const CloseOutlineFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Line x1="368" y1="368" x2="144" y2="144" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <Line x1="368" y1="144" x2="144" y2="368" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </FilterSortIconBase>
);

export const CheckmarkFsIcon = props => (
  <FilterSortIconBase {...props}>
    <Polyline points="416 128 192 384 96 288" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </FilterSortIconBase>
);
