// Only educational content is generated. IDs, privacy and progress are assigned by the server.
const string = { type: "string" };
module.exports = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: string,
    description: string,
    stages: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: string,
          description: string,
          content: string,
          questions: {
            type: "array",
            minItems: 5,
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                question: string,
                answers: {
                  type: "array",
                  minItems: 4,
                  maxItems: 4,
                  items: string,
                },
                correctAnswer: { type: "integer", minimum: 0, maximum: 3 },
                explanation: string,
              },
              required: ["question", "answers", "correctAnswer", "explanation"],
            },
          },
        },
        required: ["title", "description", "content", "questions"],
      },
    },
  },
  required: ["title", "description", "stages"],
};
