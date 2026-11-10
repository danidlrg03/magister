const schema = {
    title: "Curso de Desarrollo de JavaScript para Principiantes",
    type: "object",
    properties: {
      id: {
        type: "integer"
      },
      visible: {
        type: "boolean"
      },
      title: {
        type: "string"
      },
      description: {
        type: "string"
      },
      completionPercentage: {
        type: "integer"
      },
      isPublic: {
        type: "boolean",
        default: false
      },
      stages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {
              type: "integer"
            },
            title: {
              type: "string"
            },
            description: {
              type: "string"
            },
            content: { type: "string" },
            completed: {
              type: "boolean",
            },
            testScore: {
              type: "integer"
            },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: {
                    type: "string"
                  },
                  answers: {
                    type: "array",
                    items: {
                      type: "string"
                    }
                  },
                  correctAnswer: {
                    type: "integer"
                  }
                },
                required: ["question", "answers", "correctAnswer"]
              }
            }
          },
          required: ["id", "title", "description", "content", "completed", "testScore", "questions"]
        }
      }
    },
    required: ["id", "visible", "title", "description", "completionPercentage", "isPublic", "stages"]
  }
  

module.exports = schema;
