const {
  isGuest,
  canGuestDiscoverChatUser,
  canGuestInitiateChat,
  canGuestReply,
} = require('../app/utils/guestUtils');

describe('guestUtils.isGuest', () => {
  it('returns true for explicit guest role', () => {
    expect(isGuest({ role: 'guest' })).toBe(true);
  });

  it('returns true for stale guest payloads with non-educational email and no academic fields', () => {
    expect(
      isGuest({
        role: 'student',
        email: 'someone@gmail.com',
        university: '',
        department: '',
        stage: '',
        major: '',
      })
    ).toBe(true);
  });

  it('returns false for academic users when role is missing', () => {
    expect(
      isGuest({
        email: 'user@epu.edu.iq',
        university: 'erbilPolytechnic',
        department: 'computerScience',
      })
    ).toBe(false);
  });
});

describe('guestUtils.canGuestDiscoverChatUser', () => {
  it('blocks guest discovery of student accounts', () => {
    expect(
      canGuestDiscoverChatUser(
        { role: 'guest', email: 'guest@gmail.com' },
        { role: 'student', email: 'student@epu.edu.iq' }
      )
    ).toBe(false);
  });

  it('allows guest discovery of guest accounts', () => {
    expect(
      canGuestDiscoverChatUser(
        { role: 'guest', email: 'guest1@gmail.com' },
        { role: 'guest', email: 'guest2@gmail.com' }
      )
    ).toBe(true);
  });

  it('allows student discovery of other users', () => {
    expect(
      canGuestDiscoverChatUser(
        { role: 'student', email: 'student@epu.edu.iq' },
        { role: 'student', email: 'student2@epu.edu.iq' }
      )
    ).toBe(true);
  });
});

describe('guestUtils.canGuestInitiateChat', () => {
  const guest = {
    $id: 'guest-1',
    role: 'guest',
  };

  const student = {
    $id: 'student-1',
    role: 'student',
  };

  it('blocks one-way follow for guest to student chat', () => {
    expect(
      canGuestInitiateChat(
        {
          ...guest,
          following: ['student-1'],
          followers: [],
        },
        {
          ...student,
          following: [],
          followers: ['guest-1'],
        }
      )
    ).toBe(false);
  });

  it('allows chat only when follow relationship is mutual', () => {
    expect(
      canGuestInitiateChat(
        {
          ...guest,
          following: ['student-1'],
          followers: ['student-1'],
        },
        {
          ...student,
          following: ['guest-1'],
          followers: ['guest-1'],
        }
      )
    ).toBe(true);
  });
});

describe('guestUtils.canGuestReply', () => {
  const guest = {
    $id: 'guest-1',
    role: 'guest',
  };

  const studentAuthor = {
    $id: 'student-1',
    role: 'student',
  };

  it('blocks one-way follow for guest replying to student posts', () => {
    expect(
      canGuestReply(
        {
          ...guest,
          following: ['student-1'],
          followers: [],
        },
        {
          ...studentAuthor,
          following: [],
          followers: ['guest-1'],
        }
      )
    ).toBe(false);
  });

  it('allows replies when follow relationship is mutual', () => {
    expect(
      canGuestReply(
        {
          ...guest,
          following: ['student-1'],
          followers: ['student-1'],
        },
        {
          ...studentAuthor,
          following: ['guest-1'],
          followers: ['guest-1'],
        }
      )
    ).toBe(true);
  });
});
