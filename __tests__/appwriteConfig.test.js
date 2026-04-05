const mockSetEndpoint = jest.fn();
const mockSetProject = jest.fn();
const mockRealtimeOnMessage = jest.fn();
const mockClientInstance = {
  setEndpoint: mockSetEndpoint,
  setProject: mockSetProject,
  realtime: {
    onMessage: mockRealtimeOnMessage,
  },
};

mockSetEndpoint.mockReturnValue(mockClientInstance);
mockSetProject.mockReturnValue(mockClientInstance);

const MockClient = jest.fn(() => mockClientInstance);
const MockAccount = jest.fn();
const MockDatabases = jest.fn();
const MockStorage = jest.fn();

jest.mock('appwrite', () => ({
  Client: MockClient,
  Account: MockAccount,
  Databases: MockDatabases,
  Storage: MockStorage,
}));

describe('database/config Appwrite bootstrap', () => {
  const originalEnv = { ...process.env };
  const originalWindow = global.window;
  const originalWebSocket = global.WebSocket;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    mockClientInstance.realtime.onMessage = mockRealtimeOnMessage;
    delete mockClientInstance.realtime.__ccMessagePatchApplied;

    process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT = 'https://example.appwrite.io/v1';
    process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID = 'project-123';

    global.window = {};

    const originalSend = jest.fn();
    function TestWebSocket() {
      this.readyState = 0;
    }
    TestWebSocket.prototype.send = originalSend;
    global.WebSocket = TestWebSocket;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.window = originalWindow;
    global.WebSocket = originalWebSocket;
  });

  it('keeps the web SDK bootstrap but installs the required React Native compatibility shims', () => {
    const configModule = require('../database/config');

    expect(MockClient).toHaveBeenCalledTimes(1);
    expect(mockSetEndpoint).toHaveBeenCalledWith('https://example.appwrite.io/v1');
    expect(mockSetProject).toHaveBeenCalledWith('project-123');
    expect(MockAccount).toHaveBeenCalledWith(mockClientInstance);
    expect(MockDatabases).toHaveBeenCalledWith(mockClientInstance);
    expect(MockStorage).toHaveBeenCalledWith(mockClientInstance);

    expect(global.window.localStorage).toBeDefined();
    expect(global.window.localStorage.getItem('missing')).toBeNull();
    global.window.localStorage.setItem('cookieFallback', 'session');
    expect(global.window.localStorage.getItem('cookieFallback')).toBe('session');

    const socket = new global.WebSocket();
    const originalSend = socket.send.__ccOriginalSend;
    socket.readyState = 0;
    socket.send('ignored');
    expect(originalSend).not.toHaveBeenCalled();

    socket.readyState = 1;
    socket.send('delivered');
    expect(originalSend).toHaveBeenCalledWith('delivered');

    const realtimeEvent = {
      data: JSON.stringify({
        type: 'event',
        data: {
          channels: 'databases.test.documents',
          payload: { ok: true },
        },
      }),
    };

    configModule.default.realtime.onMessage(realtimeEvent);
    expect(mockRealtimeOnMessage).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockRealtimeOnMessage.mock.calls[0][0].data).data.channels).toEqual(['databases.test.documents']);
  });

  it('does not stack-patch WebSocket.send across repeated module evaluation', () => {
    jest.isolateModules(() => {
      require('../database/config');
    });
    const firstPatchedSend = global.WebSocket.prototype.send;

    jest.isolateModules(() => {
      require('../database/config');
    });
    const secondPatchedSend = global.WebSocket.prototype.send;

    expect(secondPatchedSend).toBe(firstPatchedSend);
    expect(secondPatchedSend.__ccSafeSendPatched).toBe(true);
  });
});