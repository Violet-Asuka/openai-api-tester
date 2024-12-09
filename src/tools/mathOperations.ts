import { MathDetails } from "@/types/apiTypes";

// 基础数学运算类型
type BasicOperation = {
  type: 'basic';
  expression: string;
};

// 方程求解类型
type EquationOperation = {
  type: 'equation';
  expression: string;
};

// 导数计算类型
type DerivativeOperation = {
  type: 'derivative';
  expression: string;
};

// 概率计算类型
type ProbabilityOperation = {
  type: 'probability';
  expression: string;
};

// 复杂计算类型
type ComplexOperation = {
  type: 'complex';
  expression: string;
};

// 统一数学运算类型
type MathOperation = 
  | BasicOperation 
  | EquationOperation 
  | DerivativeOperation 
  | ProbabilityOperation 
  | ComplexOperation;

export class MathOperations {
  // 基础运算处理
  private static handleBasicOperation(expression: string): string {
    try {
      // 替换数学符号
      const sanitizedExpr = expression
        .replace(/\^/g, '**')  // 处理指数
        .replace(/×/g, '*')    // 处理乘号
        .replace(/÷/g, '/')    // 处理除号
        .replace(/π/g, Math.PI.toString()) // 处理 π
        .replace(/e/g, Math.E.toString()); // 处理自然对数 e

      // 使用 Function 代替 eval 以获得更好的安全性
      const calculate = new Function(`return ${sanitizedExpr}`);
      const result = calculate();
      
      return typeof result === 'number' ? result.toString() : 'Invalid expression';
    } catch (err: unknown) {
      const error = err as Error;
      throw new Error(`Basic operation error: ${error.message}`);
    }
  }

  // 方程求解处理
  private static handleEquation(expression: string): string {
    try {
      // 简单的线性方程求解实现
      const [leftSide, rightSide] = expression.split('=').map(s => s.trim());
      
      // 将所有项移到左边
      const rearranged = `${leftSide}-(${rightSide})`;
      
      // 提取 x 的系数和常数项
      const terms = rearranged.match(/(-?\d*x)|(-?\d+)/g) || [];
      let coefficient = 0;
      let constant = 0;
      
      terms.forEach(term => {
        if (term.includes('x')) {
          coefficient += parseInt(term.replace('x', '') || '1');
        } else {
          constant += parseInt(term);
        }
      });
      
      // 求解 x
      const solution = -constant / coefficient;
      return `x = ${solution}`;
    } catch (err: unknown) {
      const error = err as Error;
      throw new Error(`Equation solving error: ${error.message}`);
    }
  }

  // 导数计算处理
  private static handleDerivative(expression: string): string {
    try {
      // 简单的多项式导数计算
      const terms = expression.match(/(-?\d*x\^?\d*)|(-?\d+)/g) || [];
      const derivative = terms.map(term => {
        if (!term.includes('x')) return '0';
        
        const [coefficient, power] = term.split('x^').map(s => s || '1');
        if (!power) return coefficient === '1' ? '1' : coefficient;
        
        const newCoefficient = parseInt(coefficient) * parseInt(power);
        const newPower = parseInt(power) - 1;
        
        return newPower === 1 
          ? `${newCoefficient}x`
          : newPower === 0 
            ? newCoefficient.toString()
            : `${newCoefficient}x^${newPower}`;
      });
      
      return derivative.filter(t => t !== '0').join(' + ') || '0';
    } catch (err: unknown) {
      const error = err as Error;
      throw new Error(`Derivative calculation error: ${error.message}`);
    }
  }

  // 概率计算处理
  private static handleProbability(expression: string): string {
    try {
      // 处理常见的概率场景
      if (expression.toLowerCase().includes('dice') && expression.includes('7')) {
        return '6/36'; // 两个骰子和为7的概率
      }
      
      if (expression.toLowerCase().includes('coin') && expression.includes('heads')) {
        return '1/2'; // 硬币正面的概率
      }
      
      throw new Error('Unsupported probability scenario');
    } catch (err: unknown) {
      const error = err as Error;
      throw new Error(`Probability calculation error: ${error.message}`);
    }
  }

  // 复杂计算处理
  private static handleComplexOperation(expression: string): string {
    try {
      interface MathFunctions {
        [key: string]: (x: number) => number;
      }

      const mathFunctions: MathFunctions = {
        'sin': Math.sin,
        'cos': Math.cos,
        'tan': Math.tan,
        'log': Math.log10,
        'ln': Math.log,
        'sqrt': Math.sqrt
      };
      
      // 替换数学常数
      let processedExpr = expression
        .replace(/π/g, Math.PI.toString())
        .replace(/e/g, Math.E.toString());
      
      // 处理数学函数
      Object.entries(mathFunctions).forEach(([func, implementation]) => {
        const regex = new RegExp(`${func}\\((.*?)\\)`, 'g');
        processedExpr = processedExpr.replace(regex, (_, args) => {
          const value = implementation(parseFloat(args));
          return value.toString();
        });
      });
      
      // 计算最终结果
      return MathOperations.handleBasicOperation(processedExpr);
    } catch (err: unknown) {
      const error = err as Error;
      throw new Error(`Complex calculation error: ${error.message}`);
    }
  }

  // 主要处理方法
  public static calculate(operation: MathOperation): MathDetails {
    try {
      let result: string;
      
      switch (operation.type) {
        case 'basic':
          result = this.handleBasicOperation(operation.expression);
          break;
        case 'equation':
          result = this.handleEquation(operation.expression);
          break;
        case 'derivative':
          result = this.handleDerivative(operation.expression);
          break;
        case 'probability':
          result = this.handleProbability(operation.expression);
          break;
        case 'complex':
          result = this.handleComplexOperation(operation.expression);
          break;
        default:
          throw new Error('Unsupported operation type');
      }

      return {
        operation_type: operation.type,
        expression: operation.expression,
        result
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        operation_type: operation.type,
        expression: operation.expression,
        error: error.message
      };
    }
  }
} 