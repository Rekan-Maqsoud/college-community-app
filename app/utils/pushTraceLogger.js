const noop = () => {};

export default {
  trace: noop,
  traceWarn: noop,
  traceError: noop,
  boot: noop,
  bootWarn: noop,
  bootError: noop,
  origin: noop,
  originWarn: noop,
  originError: noop,
  transit: noop,
  transitWarn: noop,
  transitError: noop,
  device: noop,
  deviceWarn: noop,
  deviceError: noop,
  app: noop,
  appWarn: noop,
  appError: noop,
  dumpConfig: noop,
};
