import { describe, expect, test } from 'vitest';
import { render, fireEvent } from 'solid-testing-library';
import TestOnly from "./TestOnly"

describe('<TestOnly />', () => {
  test('it will render message', () => {
    const { unmount, container } = render(() => <TestOnly />);
    const testOnly = container.firstChild as HTMLDivElement
    expect(testOnly.innerHTML).toBe("This is a test")
    fireEvent.mouseEnter(testOnly)
    expect(testOnly.innerHTML).toBe("This is a hover test")
    unmount();
  });
})
