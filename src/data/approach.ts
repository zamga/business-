/**
 * The five stages of a transaction. Each stage places one member of the
 * structure; assembled, the five members form the BERGWEISS mark.
 */
export type MemberKey = 'base' | 'left' | 'right' | 'beam' | 'brace';

export interface Stage {
  number: string;
  title: string;
  element: string;
  member: MemberKey;
  memberName: string;
  summary: string;
  detail: string;
  decisions: string;
  deliverables: string[];
}

export const stages: Stage[] = [
  {
    number: '01',
    title: 'Assessment',
    element: 'Strategy',
    member: 'base',
    memberName: 'Foundation',
    summary:
      'We start with the objective, not the transaction: what you want to achieve, by when, and what would make a deal worth doing. The answer is the foundation everything else rests on.',
    detail:
      'We clarify the objective, test it against the business and the market, and decide with you whether, when and how to proceed.',
    decisions:
      'What outcome would make a transaction worthwhile? What matters beyond price: control, people, legacy, timing?',
    deliverables: ['Initial assessment', 'Indicative valuation', 'Options and timetable'],
  },
  {
    number: '02',
    title: 'Preparation',
    element: 'Valuation',
    member: 'left',
    memberName: 'First column',
    summary:
      'We establish what the business is worth, to whom and why, and prepare it to withstand scrutiny: the equity story, the financial information and the documents the other side will test.',
    detail:
      'We establish value and readiness: the equity story, the financial basis and the issues a counterparty is certain to raise.',
    decisions: 'Which issues to resolve before going to market, and which to disclose and explain?',
    deliverables: ['Valuation analysis', 'Equity story', 'Information memorandum', 'Financial model'],
  },
  {
    number: '03',
    title: 'Engagement',
    element: 'Counterparties',
    member: 'right',
    memberName: 'Second column',
    summary:
      'We identify the parties who belong at the table and approach them in confidence, in an order and at a pace that protects your position.',
    detail:
      'We identify and approach the parties who should be at the table, in confidence and in a deliberate sequence.',
    decisions: 'Who should be approached, who should not, and in what order?',
    deliverables: ['Long list and short list', 'Anonymised teaser', 'Non-disclosure agreements', 'Process letter'],
  },
  {
    number: '04',
    title: 'Negotiation',
    element: 'Terms',
    member: 'beam',
    memberName: 'Beam',
    summary:
      'We bring both sides to terms on price, structure, conditions and protections, keeping competitive tension where it helps and finding common ground where it is needed.',
    detail:
      'We bring the two sides to agreement on price, structure, conditions and protections. The beam is the agreement: it spans both columns.',
    decisions: 'Which offer, on which terms, and where to concede to secure what matters most?',
    deliverables: ['Offer analysis', 'Negotiation strategy', 'Letter of intent or term sheet'],
  },
  {
    number: '05',
    title: 'Completion',
    element: 'Execution',
    member: 'brace',
    memberName: 'Brace',
    summary:
      'We manage due diligence, documentation and conditions through signing and closing: the work that turns an agreement in principle into a completed transaction.',
    detail:
      'We manage due diligence, documentation and conditions through to signing and closing. A frame without a brace can still move; execution is what makes the structure hold.',
    decisions: 'Final terms, final approvals, final signatures.',
    deliverables: ['Due diligence management', 'Document coordination', 'Signing and closing checklist'],
  },
];
