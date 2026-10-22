import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';
import { ToastProvider } from './components/Toast';
import { STORAGE_KEY } from './lib/storage';

function renderApp() {
  return render(
    <ToastProvider>
      <App />
    </ToastProvider>,
  );
}

const nameInput = () => screen.getByRole('textbox', { name: 'Friend' });
const amountInput = () => screen.getByRole('textbox', { name: 'Amount paid' });

async function addFriend(user: UserEvent, name: string, amount: string) {
  await user.type(nameInput(), name);
  if (amount) await user.type(amountInput(), amount);
  await user.click(screen.getByRole('button', { name: /add friend/i }));
}

async function addExampleGroup(user: UserEvent) {
  await addFriend(user, 'Alice', '900');
  await addFriend(user, 'Bob', '300');
  // Keyboard flow: Enter in the name jumps to amount, Enter on an empty amount adds with zero.
  await user.type(nameInput(), 'Charlie{Enter}');
  expect(amountInput()).toHaveFocus();
  await user.keyboard('{Enter}');
}

describe('Splitzy app', () => {
  it('shows the empty state first', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: /who owes who/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try a sample group/i })).toBeInTheDocument();
  });

  it('adds friends and calculates who pays whom', async () => {
    const user = userEvent.setup();
    renderApp();
    await addExampleGroup(user);

    const summary = screen.getByRole('region', { name: 'Total spent' });
    expect(within(summary).getAllByText('₹1,200').length).toBeGreaterThan(0);
    expect(within(summary).getAllByText('₹400').length).toBeGreaterThan(0);

    const settle = screen.getByRole('region', { name: 'Who pays whom?' });
    expect(within(settle).getByText('Charlie pays Alice ₹400')).toBeInTheDocument();
    expect(within(settle).getByText('Bob pays Alice ₹100')).toBeInTheDocument();
    expect(nameInput()).toHaveFocus();
  });

  it('validates amounts inline', async () => {
    const user = userEvent.setup();
    renderApp();
    await addFriend(user, 'Alice', '-50');
    expect(screen.getByRole('alert')).toHaveTextContent("Amounts can't be negative");
    expect(amountInput()).toHaveAttribute('aria-invalid', 'true');
  });

  it('offers to merge a duplicate name instead of adding a second person', async () => {
    const user = userEvent.setup();
    renderApp();
    await addFriend(user, 'Alice', '900');
    await addFriend(user, ' alice ', '100');

    await user.click(screen.getByRole('button', { name: 'Add to Alice' }));
    const crew = screen.getByRole('region', { name: /the crew/i });
    expect(within(crew).getAllByRole('listitem')).toHaveLength(1);
    expect(within(crew).getByText('₹1,000')).toBeInTheDocument();
  });

  it('edits a member', async () => {
    const user = userEvent.setup();
    renderApp();
    await addExampleGroup(user);

    await user.click(screen.getByRole('button', { name: 'Edit Bob' }));
    const crew = screen.getByRole('region', { name: /the crew/i });
    const amount = within(crew).getByRole('textbox', { name: 'Amount paid' });
    await user.clear(amount);
    await user.type(amount, '400{Enter}');

    expect(within(crew).getByText('₹400')).toBeInTheDocument();
    // ₹1,300 / 3 leaves one paisa over; Alice (top payer) absorbs it.
    expect(screen.getByText('Charlie pays Alice ₹433.33')).toBeInTheDocument();
    expect(screen.getByText('Bob pays Alice ₹33.33')).toBeInTheDocument();
  });

  it('removes a member and can undo it', async () => {
    const user = userEvent.setup();
    renderApp();
    await addExampleGroup(user);

    await user.click(screen.getByRole('button', { name: 'Remove Bob' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Edit Bob' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('button', { name: 'Edit Bob' })).toBeInTheDocument();
  });

  it('restores the split after a refresh', async () => {
    const user = userEvent.setup();
    const first = renderApp();
    await addExampleGroup(user);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Charlie');
    first.unmount();

    renderApp();
    expect(screen.getByText('Charlie pays Alice ₹400')).toBeInTheDocument();
  });

  it('copies settlement instructions', async () => {
    const user = userEvent.setup();
    renderApp();
    await addExampleGroup(user);

    await user.click(screen.getByRole('button', { name: 'Copy' }));
    const copied = await navigator.clipboard.readText();
    expect(copied).toBe(
      ['Group expenses', 'Total: ₹1,200', 'People: 3', 'Share: ₹400 each', '', 'Charlie pays Alice: ₹400', 'Bob pays Alice: ₹100'].join(
        '\n',
      ),
    );
    expect(await screen.findByText(/copied! paste it/i)).toBeInTheDocument();
  });

  it('marks a transfer as paid without changing contributions', async () => {
    const user = userEvent.setup();
    renderApp();
    await addExampleGroup(user);

    const toggle = screen.getByRole('button', { name: 'Mark paid: Bob to Alice' });
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Paid: Bob to Alice' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1 of 2 paid')).toBeInTheDocument();
    expect(screen.getByText('Bob pays Alice ₹100, marked as paid')).toBeInTheDocument();
  });

  it('asks before starting a new split', async () => {
    const user = userEvent.setup();
    renderApp();
    await addExampleGroup(user);

    await user.click(screen.getByRole('button', { name: /new split/i }));
    const dialog = screen.getByRole('alertdialog', { name: /start a new split/i });
    await user.click(within(dialog).getByRole('button', { name: 'Start fresh' }));
    expect(await screen.findByRole('button', { name: /try a sample group/i })).toBeInTheDocument();
  });
});
