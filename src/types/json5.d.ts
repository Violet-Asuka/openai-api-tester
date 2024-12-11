declare module '*.JSON5' {
  const content: {
    questions: Array<{
      id: string;
      title: string;
      question: string;
      referenceAnswer: string;
      category: string;
      difficulty: "basic" | "intermediate" | "advanced";
      expectedConcepts: string[];
    }>;
  };
  export default content;
} 