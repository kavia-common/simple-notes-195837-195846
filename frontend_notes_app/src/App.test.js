import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders notes header", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /notes/i })).toBeInTheDocument();
});

test("renders add note input", () => {
  render(<App />);
  expect(screen.getByLabelText(/new note/i)).toBeInTheDocument();
});
