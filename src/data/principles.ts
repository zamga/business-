export interface Principle {
  name: string;
  line: string;
  detail: string;
}

/** What clients rely on the firm for, in the order a transaction tests them. */
export const principles: Principle[] = [
  {
    name: 'Judgment',
    line: 'Advice weighed against your wider interests, including when the right answer is not to transact.',
    detail:
      'A transaction is a means, not an end. Our advice starts from what you want for the business and its owners, and says so plainly when a deal would not serve it.',
  },
  {
    name: 'Discretion',
    line: 'Confidentiality designed into every step: who is approached, what they see, and when.',
    detail:
      'Information is released in stages, to as few parties as necessary, under agreements that protect it. Employees, customers and competitors learn of a transaction when you decide.',
  },
  {
    name: 'Access',
    line: 'The right counterparties, identified on fit and approached on your terms.',
    detail:
      'The best counterparty is rarely the most obvious one. We look widely for the buyers, sellers and investors for whom your transaction makes the most sense.',
  },
  {
    name: 'Alignment',
    line: 'In every mandate we act for one party: our client.',
    detail:
      'Our role is advisory. We represent the client who appointed us; the capital in the transaction, and the decision to commit it, remain theirs.',
  },
  {
    name: 'Execution',
    line: 'Attention to detail through signing and closing, where value is most often lost.',
    detail:
      'Agreements in principle are the beginning of the hardest part. We hold the process together through due diligence, documentation and conditions until the transaction completes.',
  },
];
