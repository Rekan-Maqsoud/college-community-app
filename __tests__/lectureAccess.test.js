import {
  canLinkLectureGroup,
  canManageLectureChannel,
  getLectureManagerIds,
} from '../app/utils/lectureAccess';

describe('lectureAccess', () => {
  it('parses manager ids from both csv and array storage', () => {
    expect(getLectureManagerIds({ managerIds: 'user_1,user_2,user_1' })).toEqual(['user_1', 'user_2']);
    expect(getLectureManagerIds({ managerIds: ['user_3', 'user_4', 'user_3'] })).toEqual(['user_3', 'user_4']);
  });

  it('recognizes channel managers through any actor identity', () => {
    const actor = {
      $id: 'profile_doc_id',
      accountId: 'account_user_id',
      userId: 'account_user_id',
    };

    expect(canManageLectureChannel({ ownerId: 'owner_id', managerIds: 'account_user_id' }, actor)).toBe(true);
    expect(canManageLectureChannel({ ownerId: 'account_user_id', managerIds: '' }, actor)).toBe(true);
    expect(canManageLectureChannel({ ownerId: 'owner_id', managerIds: 'someone_else' }, actor)).toBe(false);
  });

  it('allows lecture group linking for stage representatives and custom group admins', () => {
    const actor = {
      $id: 'profile_doc_id',
      accountId: 'account_user_id',
      userId: 'account_user_id',
    };

    expect(canLinkLectureGroup({
      $id: 'chat_1',
      type: 'stage_group',
      representatives: ['account_user_id'],
      admins: [],
    }, actor)).toBe(true);

    expect(canLinkLectureGroup({
      $id: 'chat_2',
      type: 'custom',
      representatives: [],
      admins: ['account_user_id'],
    }, actor)).toBe(true);

    expect(canLinkLectureGroup({
      $id: 'chat_3',
      type: 'private',
      representatives: ['account_user_id'],
      admins: ['account_user_id'],
    }, actor)).toBe(false);
  });
});