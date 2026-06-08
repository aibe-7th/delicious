export const MSG = {
  action: {
    delete: '삭제',
    edit: '수정',
    register: '등록',
  },
  auth: {
    deleteAccountSuccess: '탈퇴가 완료되었습니다.',
    emailVerified: '이메일 인증이 완료되었습니다. 로그인해 주세요.',
    loginAction: '로그인하기',
    loginRequiredCommentCta: '로그인 후 댓글을 남길 수 있습니다.',
    loginRequiredForComment: '로그인 후 댓글을 작성할 수 있습니다.',
    loginRequiredForReview: '로그인 후 작성할 수 있습니다.',
    logoutSuccess: '로그아웃했습니다.',
    verifyDescription:
      '가입한 이메일 주소로 인증 메일을 보냈습니다. 메일함에서 인증을 완료한 뒤 로그인해 주세요.',
    verifyTitle: '이메일 인증이 필요합니다',
  },
  comment: {
    empty: '댓글이 없습니다.',
    placeholder: '댓글 쓰기',
  },
  confirm: {
    deleteAccount: '정말 탈퇴할까요? 작성한 리뷰와 댓글이 모두 삭제됩니다.',
    deleteReview: '리뷰를 삭제할까요?',
  },
  empty: {
    myComments: '작성한 댓글이 없습니다.',
    myReviews: '작성한 글이 없습니다.',
    reviews: '아직 등록된 맛집 리뷰가 없습니다.',
  },
  form: {
    editReviewTitle: '리뷰 수정',
  },
  place: {
    notConfigured: '지도 검색을 사용할 수 없습니다. 관리자에게 문의해 주세요.',
    sdkFail: '지도 검색을 불러오지 못했습니다.',
    searchFail: '검색에 실패했습니다. 다시 시도해 주세요.',
    empty: '검색 결과가 없습니다. 다른 키워드로 검색해 보세요.',
    queryRequired: '검색어를 입력해 주세요.',
    selected: '선택한 위치의 좌표를 입력했습니다.',
    locationRequired: '장소를 검색해 위치를 선택해 주세요.',
    outOfKorea: '한국 범위를 벗어난 좌표라 지도를 표시할 수 없습니다.',
  },
  profile: {
    nicknameRequired: '닉네임을 입력해 주세요.',
    nicknameUpdated: '닉네임을 변경했습니다.',
  },
  review: {
    loadFail: '리뷰를 불러오지 못했습니다.',
  },
  system: {
    notReady: '서비스 준비 중입니다. 잠시 후 다시 시도해 주세요.',
    unknownError: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
};

const ERROR_TRANSLATIONS = [
  {
    includes: 'email not confirmed',
    message: '이메일 인증 후 로그인할 수 있습니다.',
  },
  {
    includes: 'email link is invalid or has expired',
    message: '인증 링크가 만료되었습니다. 인증 메일을 다시 요청해 주세요.',
  },
  {
    includes: 'invalid login credentials',
    message: '이메일 또는 비밀번호를 확인해 주세요.',
  },
  {
    includes: 'user already registered',
    message: '이미 가입된 이메일입니다.',
  },
  {
    includes: 'signup disabled',
    message: '현재 회원가입을 사용할 수 없습니다.',
  },
  {
    includes: 'password should be at least',
    message: '비밀번호는 최소 6자 이상 입력해 주세요.',
  },
  {
    includes: 'rate limit',
    message: '요청이 많습니다. 잠시 후 다시 시도해 주세요.',
  },
  {
    includes: 'for security purposes',
    message: '보안을 위해 잠시 후 다시 시도해 주세요.',
  },
  {
    includes: 'jwt expired',
    message: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
  },
  {
    includes: 'row-level security',
    message: '권한이 없어 요청을 처리할 수 없습니다.',
  },
  {
    includes: 'permission denied',
    message: '권한이 없어 요청을 처리할 수 없습니다.',
  },
  {
    includes: 'failed to fetch',
    message: '네트워크 연결을 확인해 주세요.',
  },
];

// 메시지를 화면용 한글 문구로 변환한다
export function getMessage(value) {
  const rawMessage = value?.message ?? String(value || MSG.system.unknownError);
  const lowerMessage = rawMessage.toLowerCase();
  const matched = ERROR_TRANSLATIONS.find(({ includes }) =>
    lowerMessage.includes(includes),
  );

  return matched?.message ?? rawMessage;
}
