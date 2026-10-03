/**
 * Enquiry form behaviour: validation with inline errors and a focusable
 * summary, honest submission states, and topic prefill from ?topic=.
 */
type FieldName = 'clientType' | 'topic' | 'name' | 'email' | 'consent';

const messages: Record<FieldName, (value: string) => string | null> = {
  clientType: (v) => (v ? null : 'Select the option that best describes you.'),
  topic: (v) => (v ? null : 'Select what your enquiry concerns.'),
  name: (v) => (v.trim().length >= 2 ? null : 'Enter your name.'),
  email: (v) => {
    if (!v.trim()) return 'Enter your email address.';
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
      ? null
      : 'Enter an email address in the format name@company.com.';
  },
  consent: (v) => (v ? null : 'Confirm that we may use your details to respond.'),
};

const fieldLabels: Record<FieldName, string> = {
  clientType: 'You are',
  topic: 'Your enquiry concerns',
  name: 'Name',
  email: 'Email',
  consent: 'Consent',
};

const TIMEOUT_MS = 15000;

export function initEnquiry(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>('[data-form]');
  const summary = root.querySelector<HTMLElement>('[data-summary]');
  const summaryList = root.querySelector<HTMLElement>('[data-summary-list]');
  const submit = root.querySelector<HTMLButtonElement>('[data-submit]');
  const submitLabel = root.querySelector<HTMLElement>('[data-submit-label]');
  const status = root.querySelector<HTMLElement>('[data-status]');
  const result = root.querySelector<HTMLElement>('[data-result]');
  if (!form || !summary || !summaryList || !submit || !submitLabel || !status || !result) return;

  const endpoint = (root.dataset.endpoint ?? '').trim();
  const directEmail = (root.dataset.email ?? '').trim();
  form.noValidate = true;

  // Prefill the topic from links such as /contact/?topic=sell-side.
  const topic = new URLSearchParams(window.location.search).get('topic');
  if (topic) {
    const radio = form.querySelector<HTMLInputElement>(`input[name="topic"][value="${CSS.escape(topic)}"]`);
    if (radio) radio.checked = true;
  }

  const valueOf = (name: FieldName): string => {
    const data = new FormData(form);
    const value = data.get(name);
    return typeof value === 'string' ? value : '';
  };

  const fieldEl = (name: FieldName) => form.querySelector<HTMLElement>(`[data-field="${name}"]`);

  const setError = (name: FieldName, message: string | null) => {
    const field = fieldEl(name);
    if (!field) return;
    const error = field.querySelector<HTMLElement>('[data-error]');
    const inputs = field.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    field.toggleAttribute('data-invalid', Boolean(message));
    inputs.forEach((input) => input.setAttribute('aria-invalid', message ? 'true' : 'false'));
    if (error) {
      error.textContent = message ?? '';
      error.hidden = !message;
    }
  };

  const validate = (name: FieldName) => {
    const message = messages[name](valueOf(name));
    setError(name, message);
    return message;
  };

  // Validate on blur only after a first interaction, then live while correcting.
  const touched = new Set<FieldName>();
  form.addEventListener('focusout', (event) => {
    const target = event.target as HTMLInputElement;
    const name = target.name as FieldName;
    if (!(name in messages)) return;
    if (target.type === 'radio') return;
    touched.add(name);
    validate(name);
  });
  form.addEventListener('input', (event) => {
    const name = (event.target as HTMLInputElement).name as FieldName;
    if (name in messages && (touched.has(name) || fieldEl(name)?.hasAttribute('data-invalid'))) validate(name);
  });
  form.addEventListener('change', (event) => {
    const name = (event.target as HTMLInputElement).name as FieldName;
    if (name in messages && fieldEl(name)?.hasAttribute('data-invalid')) validate(name);
  });

  const showSummary = (errors: Array<[FieldName, string]>) => {
    summaryList.replaceChildren(
      ...errors.map(([name, message]) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        const target = fieldEl(name)?.querySelector<HTMLElement>('input, textarea');
        a.href = `#${target?.id || ''}`;
        a.textContent = `${fieldLabels[name]}: ${message}`;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          target?.focus();
        });
        li.append(a);
        return li;
      }),
    );
    summary.hidden = false;
    summary.focus();
  };

  const setBusy = (busy: boolean) => {
    submit.disabled = busy;
    submit.setAttribute('aria-busy', String(busy));
    submitLabel.textContent = busy ? 'Sending…' : 'Send enquiry';
  };

  const showResult = (opts: {
    tone: 'success' | 'pending';
    label: string;
    title: string;
    text: string;
    actions?: HTMLElement[];
  }) => {
    result.dataset.tone = opts.tone;
    result.querySelector('[data-result-label]')!.textContent = opts.label;
    result.querySelector('[data-result-title]')!.textContent = opts.title;
    result.querySelector('[data-result-text]')!.textContent = opts.text;
    result.querySelector('[data-result-actions]')!.replaceChildren(...(opts.actions ?? []));
    result.hidden = false;
    form.hidden = true;
    result.focus();
  };

  const backButton = (label: string) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {
      result.hidden = true;
      form.hidden = false;
      submit.focus();
    });
    return button;
  };

  const mailLink = (address: string) => {
    const a = document.createElement('a');
    a.href = `mailto:${address}`;
    a.textContent = `Write to ${address}`;
    return a;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    delete status.dataset.tone;

    const errors = (Object.keys(messages) as FieldName[])
      .map((name) => [name, validate(name)] as const)
      .filter((entry): entry is readonly [FieldName, string] => entry[1] !== null);

    if (errors.length > 0) {
      showSummary(errors.map(([n, m]) => [n, m]));
      return;
    }
    summary.hidden = true;

    if (!endpoint) {
      // No mailbox is connected yet: say so plainly, keep the visitor's text.
      showResult({
        tone: 'pending',
        label: 'Not sent',
        title: 'Online enquiries are not yet connected.',
        text: directEmail
          ? 'Your message has not been sent and nothing has been stored. Please write to us directly instead; your details are still in the form if you would like to copy them.'
          : 'Your message has not been sent and nothing has been stored. Your details are still in the form if you would like to keep a copy.',
        actions: [backButton('Return to the form'), ...(directEmail ? [mailLink(directEmail)] : [])],
      });
      return;
    }

    setBusy(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);

      const firstName = valueOf('name').trim().split(/\s+/)[0] ?? '';
      showResult({
        tone: 'success',
        label: 'Received',
        title: firstName ? `Thank you, ${firstName}.` : 'Thank you.',
        text: 'Your enquiry has reached us and will be read in confidence. We will contact you to arrange a first conversation.',
      });
      form.reset();
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === 'AbortError';
      status.dataset.tone = 'error';
      status.textContent = timedOut
        ? 'The connection timed out and your enquiry may not have been sent. Please try again.'
        : 'Your enquiry could not be sent. Please check your connection and try again; your details are still in the form.';
    } finally {
      window.clearTimeout(timer);
      setBusy(false);
    }
  });
}
