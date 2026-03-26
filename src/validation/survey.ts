import joi from "joi";
import { SURVEY_SCOPE, SURVEY_QUESTION_TYPE } from "../common";

const questionSchema = joi.object({
    questionText: joi.string().required(),
    questionType: joi.string().valid(...Object.values(SURVEY_QUESTION_TYPE)).default(SURVEY_QUESTION_TYPE.TEXT),
    options: joi.array().items(joi.string()).when("questionType", {
        is: joi.valid(SURVEY_QUESTION_TYPE.MULTIPLE_CHOICE, SURVEY_QUESTION_TYPE.SINGLE_CHOICE),
        then: joi.array().items(joi.string()).min(2).required(),
        otherwise: joi.array().items(joi.string()).optional(),
    }),
    isRequired: joi.boolean().default(true),
});

export const createSurveySchema = joi.object({
    title: joi.string().required(),
    description: joi.string().optional().allow(""),
    scope: joi.string().valid(...Object.values(SURVEY_SCOPE)).required(),
    groupId: joi.when("scope", {
        is: SURVEY_SCOPE.GROUP,
        then: joi.string().required(),
        otherwise: joi.string().optional().allow("", null),
    }),
    batchId: joi.when("scope", {
        is: SURVEY_SCOPE.BATCH,
        then: joi.string().required(),
        otherwise: joi.string().optional().allow("", null),
    }),
    questions: joi.array().items(questionSchema).min(1).required(),
    isActive: joi.boolean().optional(),
});

export const updateSurveySchema = joi.object({
    surveyId: joi.string().required(),
    title: joi.string().optional(),
    description: joi.string().optional().allow(""),
    scope: joi.string().valid(...Object.values(SURVEY_SCOPE)).optional(),
    groupId: joi.string().optional().allow("", null),
    batchId: joi.string().optional().allow("", null),
    questions: joi.array().items(questionSchema).min(1).optional(),
    isActive: joi.boolean().optional(),
});

export const getSurveysSchema = joi.object({
    page: joi.number().integer().min(1).optional(),
    limit: joi.number().integer().min(1).optional(),
    search: joi.string().optional().allow(""),
    scope: joi.string().valid(...Object.values(SURVEY_SCOPE)).optional(),
    groupFilter: joi.string().optional().allow(""),
    batchFilter: joi.string().optional().allow(""),
    isActive: joi.boolean().optional(),
});

const answerSchema = joi.object({
    questionId: joi.string().required(),
    answer: joi.alternatives().try(
        joi.string(),
        joi.number(),
        joi.boolean(),
        joi.array().items(joi.string()),
    ).required(),
});

export const submitSurveyResponseSchema = joi.object({
    surveyId: joi.string().required(),
    answers: joi.array().items(answerSchema).min(1).required(),
});

export const getSurveyResponsesSchema = joi.object({
    surveyId: joi.string().required(),
    page: joi.number().integer().min(1).optional(),
    limit: joi.number().integer().min(1).optional(),
});
