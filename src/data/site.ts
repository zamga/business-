/**
 * Single source of truth for firm facts.
 *
 * Every value here is a factual claim the site makes. Only fill a field with
 * information BERGWEISS has confirmed. Fields left as `null` are either
 * omitted from the site (contact details) or shown as clearly marked
 * "to be confirmed" items (legal notice), so nothing invented is published.
 */

export interface Office {
  city: string;
  addressLines: string[];
  country: string;
}

export interface SiteFacts {
  name: string;
  legalName: string | null;
  descriptor: string;
  description: string;
  locale: string;
  contact: {
    email: string | null;
    phone: string | null;
    offices: Office[];
  };
  legal: {
    registeredOffice: string | null;
    register: string | null;
    registrationNumber: string | null;
    vatId: string | null;
    representedBy: string | null;
    regulatoryStatus: string | null;
    responsibleForContent: string | null;
  };
  social: {
    linkedin: string | null;
  };
}

export const site: SiteFacts = {
  name: 'BERGWEISS',
  legalName: null,
  descriptor: 'Mergers & Acquisitions Advisory',
  description:
    'M&A advice for business owners, acquirers and investors navigating their next transaction: sell-side and buy-side advisory, valuation, strategic alternatives and transaction structuring.',
  locale: 'en_GB',
  contact: {
    email: null,
    phone: null,
    offices: [],
  },
  legal: {
    registeredOffice: null,
    register: null,
    registrationNumber: null,
    vatId: null,
    representedBy: null,
    regulatoryStatus: null,
    responsibleForContent: null,
  },
  social: {
    linkedin: null,
  },
};

/** Endpoint for enquiry submissions; empty means "not yet connected". */
export const enquiryEndpoint: string = (import.meta.env.PUBLIC_ENQUIRY_ENDPOINT ?? '').trim();

/** Preview deployments may render drafts with a visible marker. */
export const showDrafts: boolean = import.meta.env.PUBLIC_SHOW_DRAFTS === 'true';
