import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { CalculatorFlowState } from './types/calculator-flow-state.type';
import { CalculatorOperator } from './types/calculator-operator.type';
import { CalculatorPlanId } from './types/calculator-plan-id.type';

const PROCESSING_MS = 3500;
const SUCCESS_MS = 1500;

@Component({
  selector: 'app-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './calculator.component.html',
  styleUrl: './calculator.component.scss',
})
export class CalculatorComponent implements OnDestroy {
  private readonly display = signal<string>('0');
  private readonly previous = signal<number | null>(null);
  private readonly waitingForOperand = signal<boolean>(false);

  protected readonly operator = signal<CalculatorOperator | null>(null);
  protected readonly flow = signal<CalculatorFlowState>('idle');
  protected readonly selectedPlan = signal<CalculatorPlanId | null>(null);
  protected readonly pendingResult = signal<string>('');

  protected readonly displayValue = computed(() => this.formatGroup(this.display()));
  protected readonly resultValue = computed(() => this.formatGroup(this.pendingResult()));
  protected readonly clearLabel = computed(() =>
    this.display() === '0' && this.previous() === null ? 'AC' : 'C',
  );

  private processingTimer: ReturnType<typeof setTimeout> | null = null;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  public ngOnDestroy(): void {
    this.clearTimers();
  }

  protected inputDigit(digit: string): void {
    if (this.waitingForOperand()) {
      this.display.set(digit);
      this.waitingForOperand.set(false);
      return;
    }
    const current = this.display();
    if (current.replace('-', '').replace('.', '').length >= 9) {
      return;
    }
    this.display.set(current === '0' ? digit : current + digit);
  }

  protected inputDot(): void {
    if (this.waitingForOperand()) {
      this.display.set('0.');
      this.waitingForOperand.set(false);
      return;
    }
    if (!this.display().includes('.')) {
      this.display.set(this.display() + '.');
    }
  }

  protected clearEntry(): void {
    if (this.display() !== '0') {
      this.display.set('0');
      return;
    }
    this.previous.set(null);
    this.operator.set(null);
    this.waitingForOperand.set(false);
  }

  protected toggleSign(): void {
    this.display.set(this.stringify(parseFloat(this.display()) * -1));
  }

  protected percent(): void {
    this.display.set(this.stringify(parseFloat(this.display()) / 100));
  }

  protected chooseOperator(op: CalculatorOperator): void {
    const current = parseFloat(this.display());
    if (this.previous() !== null && this.operator() && !this.waitingForOperand()) {
      const result = this.compute(this.previous()!, current, this.operator()!);
      this.display.set(this.stringify(result));
      this.previous.set(result);
    } else {
      this.previous.set(current);
    }
    this.operator.set(op);
    this.waitingForOperand.set(true);
  }

  protected equals(): void {
    if (this.operator() === null || this.previous() === null) {
      return;
    }
    const current = parseFloat(this.display());
    const result = this.compute(this.previous()!, current, this.operator()!);
    this.pendingResult.set(this.stringify(result));
    this.flow.set('paywall');
  }

  protected selectPlan(plan: CalculatorPlanId): void {
    this.selectedPlan.set(plan);
    this.flow.set('processing');
    this.clearTimers();
    this.processingTimer = setTimeout(() => {
      this.flow.set('success');
      this.successTimer = setTimeout(() => this.flow.set('result'), SUCCESS_MS);
    }, PROCESSING_MS);
  }

  protected recalculate(): void {
    this.display.set(this.pendingResult());
    this.previous.set(null);
    this.operator.set(null);
    this.waitingForOperand.set(true);
    this.selectedPlan.set(null);
    this.pendingResult.set('');
    this.flow.set('idle');
  }

  private compute(a: number, b: number, op: CalculatorOperator): number {
    switch (op) {
      case '+':
        return a + b;
      case '−':
        return a - b;
      case '×':
        return a * b;
      case '÷':
        return b === 0 ? NaN : a / b;
    }
  }

  private stringify(value: number): string {
    if (!isFinite(value)) {
      return 'Error';
    }
    return parseFloat(value.toPrecision(12)).toString();
  }

  private formatGroup(raw: string): string {
    if (raw === 'Error') {
      return raw;
    }
    const neg = raw.startsWith('-');
    const body = neg ? raw.slice(1) : raw;
    const [intPart, decPart] = body.split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const out = decPart !== undefined ? `${grouped}.${decPart}` : grouped;
    return neg ? `-${out}` : out;
  }

  private clearTimers(): void {
    if (this.processingTimer !== null) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
      this.successTimer = null;
    }
  }
}
