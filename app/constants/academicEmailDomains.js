const BLOCKED_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'outlook.co.uk',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.fr',
  'ymail.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'icloud.com',
  'me.com',
  'mac.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'gmx.net',
  'tutanota.com',
  'fastmail.com',
  'inbox.com',
  'mail.ru',
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'rediffmail.com',
  'web.de',
  'libero.it',
  'virgilio.it',
  'laposte.net',
  'orange.fr',
  'wanadoo.fr',
  'free.fr',
  't-online.de',
  'arcor.de',
  'rambler.ru',
  'ukr.net',
];

const ACADEMIC_TOKEN_PATTERN = /(^|\.)(edu|ac|sch)(\.|$)/i;

const ACADEMIC_EMAIL_DOMAIN_CONFIG = [
  { domain: 'epu.edu.iq', universityKey: 'erbilPolytechnic' },
  { domain: 'su.edu.krd', universityKey: 'salahaddin' },
  { domain: 'univsul.edu.iq', universityKey: 'sulaimani' },
  { domain: 'uod.ac', universityKey: 'duhok' },
  { domain: 'hmu.edu.krd', universityKey: 'hawlerMedical' },
  { domain: 'koyauniversity.org', universityKey: 'koya' },
  { domain: 'chu.edu.iq', universityKey: 'charmo' },
  { domain: 'uor.edu.krd', universityKey: 'raparin' },
  { domain: 'soran.edu.iq', universityKey: 'soran' },
  { domain: 'uoz.edu.krd', universityKey: 'zakho' },
  { domain: 'uoh.edu.iq', universityKey: 'halabja' },
  { domain: 'garmian.edu.krd', universityKey: 'garmian' },
  { domain: 'ukh.edu.krd', universityKey: 'kurdistan' },
  { domain: 'spu.edu.iq', universityKey: 'sulaimaniPolytechnic' },
  { domain: 'dpu.edu.krd', universityKey: 'duhokPolytechnic' },
  { domain: 'gpu.edu.iq' },
  { domain: 'auis.edu.krd', universityKey: 'americanUniversity' },
  { domain: 'auk.edu.krd' },
  { domain: 'cue.edu.krd', universityKey: 'catholic' },
  { domain: 'cihanuniversity.edu.iq', universityKey: 'cihan' },
  { domain: 'sulicihan.edu.krd', universityKey: 'cihan' },
  { domain: 'duhokcihan.edu.krd', universityKey: 'cihan' },
  { domain: 'komar.edu.iq', universityKey: 'komar' },
  { domain: 'lfu.edu.krd', universityKey: 'lebanese' },
  { domain: 'uhd.edu.iq', universityKey: 'universityOfHumanDevelopment' },
  { domain: 'nawroz.edu.krd', universityKey: 'nawroz' },
  { domain: 'knu.edu.iq', universityKey: 'knowledgeUniversity' },
  { domain: 'uniq.edu.iq', universityKey: 'qaiwanInternational' },
  { domain: 'tiu.edu.iq', universityKey: 'tishkInternational' },
  { domain: 'uog.edu.iq', universityKey: 'universityCollegeOfGoizha' },
  { domain: 'ue.edu.krd', universityKey: 'internationalUniversityErbil' },
  { domain: 'bnu.edu.iq', universityKey: 'bayan' },
  { domain: 'uoalkitab.edu.iq' },
  { domain: 'alnukhba.edu.iq' },
  { domain: 'london.ac.uk', matchType: 'suffix', universityKey: 'britishInternationalUniversity' },
  { domain: 'iscerbil.sabis.net' },
  { domain: 'kti.edu.iq', universityKey: 'kurdistanTechnicalInstitute' },
  { domain: 'pti.edu.krd', universityKey: 'paitaxtTechnicalInstitute' },
  { domain: 'noble.edu.krd', universityKey: 'noblePrivateTechnicalInstitute' },
  { domain: 'aynda.shahid.edu.krd' },
  { domain: 'rwandz.shahid.edu.krd', universityKey: 'rawanduzPrivateTechnicalInstitute' },
  { domain: 'hsti.edu.krd', universityKey: 'haibatSultanTechnicalInstitute' },
];

export const ACADEMIC_EMAIL_DOMAINS = ACADEMIC_EMAIL_DOMAIN_CONFIG.map((item) => item.domain);

const normalizeDomain = (value) => String(value || '').trim().toLowerCase().replace(/^@+/, '');

const getEmailDomain = (emailOrDomain) => {
  const normalizedValue = normalizeDomain(emailOrDomain);
  if (!normalizedValue) return '';
  if (!normalizedValue.includes('@')) return normalizedValue;
  return normalizedValue.split('@').pop() || '';
};

const isBlockedPublicDomain = (domain) => BLOCKED_EMAIL_DOMAINS.includes(domain);

const matchesConfiguredDomain = (entry, domain) => {
  if (!entry || !domain) return false;
  if (entry.matchType === 'suffix') {
    return domain === entry.domain || domain.endsWith(`.${entry.domain}`);
  }
  return entry.domain === domain;
};

const findMatchingDomainEntry = (domain) => {
  if (!domain) return null;
  return ACADEMIC_EMAIL_DOMAIN_CONFIG.find((entry) => matchesConfiguredDomain(entry, domain)) || null;
};

export const getUniversityKeyByEmailDomain = (emailOrDomain) => {
  const domain = getEmailDomain(emailOrDomain);
  const matchedEntry = findMatchingDomainEntry(domain);
  return matchedEntry?.universityKey || '';
};

const hasAcademicPattern = (domain) => {
  if (!domain) return false;
  return ACADEMIC_TOKEN_PATTERN.test(domain);
};

export const isEducationalEmail = (email) => {
  const domain = getEmailDomain(email);
  if (!domain || isBlockedPublicDomain(domain)) {
    return false;
  }

  if (findMatchingDomainEntry(domain)) {
    return true;
  }

  return hasAcademicPattern(domain);
};

const getDomainSuggestionScore = (domain, query) => {
  if (!query) return 0;
  const startsWithScore = domain.startsWith(query) ? 0 : 5;
  const index = domain.indexOf(query);
  const containsPenalty = index === -1 ? 50 : Math.min(index, 25);
  const lengthPenalty = Math.abs(domain.length - query.length) / 100;
  return startsWithScore + containsPenalty + lengthPenalty;
};

export const getAcademicDomainSuggestions = (emailValue, limit = 3) => {
  const normalizedEmail = String(emailValue || '').trim().toLowerCase();
  const atIndex = normalizedEmail.lastIndexOf('@');
  if (atIndex === -1) {
    return [];
  }

  const query = normalizedEmail.substring(atIndex + 1).trim();

  return ACADEMIC_EMAIL_DOMAINS
    .filter((domain) => {
      if (!query) return true;
      return domain.includes(query);
    })
    .sort((left, right) => getDomainSuggestionScore(left, query) - getDomainSuggestionScore(right, query))
    .slice(0, limit)
    .map((domain) => ({
      domain,
      universityKey: getUniversityKeyByEmailDomain(domain),
    }));
};

export const applyDomainToEmail = (emailValue, domain) => {
  const normalizedDomain = normalizeDomain(domain);
  const currentValue = String(emailValue || '').trim();
  if (!normalizedDomain) return currentValue;

  const atIndex = currentValue.lastIndexOf('@');
  if (atIndex === -1) {
    return `${currentValue}@${normalizedDomain}`;
  }

  return `${currentValue.substring(0, atIndex)}@${normalizedDomain}`;
};
