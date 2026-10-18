package de.ffl.controller;

import de.ffl.domain.QuestionType;
import de.ffl.dto.SurveyAdminDto;
import de.ffl.dto.SurveyAnswerInput;
import de.ffl.dto.SurveyAnswerRequest;
import de.ffl.dto.SurveyCreateRequest;
import de.ffl.dto.SurveyQuestionRequest;
import de.ffl.service.SurveyService;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SurveyResultsControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SurveyService surveyService;

    private Long createEndedSurvey(Long[] hiddenQuestionId, Long[] visibleQuestionId) {
        SurveyCreateRequest req = new SurveyCreateRequest();
        req.setTitle("Mitgliederumfrage");
        req.setDeadline(LocalDateTime.now().plusDays(30));
        SurveyQuestionRequest name = new SurveyQuestionRequest();
        name.setType(QuestionType.TEXTFIELD);
        name.setText("Wie heißt Du? (optional)");
        name.setHideInMemberResults(true);
        SurveyQuestionRequest rating = new SurveyQuestionRequest();
        rating.setType(QuestionType.RATING);
        rating.setText("Wie zufrieden?");
        rating.setRequired(true);
        req.setQuestions(List.of(name, rating));

        SurveyAdminDto dto = surveyService.startSurvey(surveyService.createSurvey(req).getId());
        hiddenQuestionId[0] = dto.getQuestions().get(0).getId();
        visibleQuestionId[0] = dto.getQuestions().get(1).getId();
        SurveyAnswerInput nameAnswer = new SurveyAnswerInput();
        nameAnswer.setQuestionId(hiddenQuestionId[0]);
        nameAnswer.setValue("Klaus");
        SurveyAnswerInput ratingAnswer = new SurveyAnswerInput();
        ratingAnswer.setQuestionId(visibleQuestionId[0]);
        ratingAnswer.setValue("4");
        SurveyAnswerRequest submit = new SurveyAnswerRequest();
        submit.setAnswers(List.of(nameAnswer, ratingAnswer));
        surveyService.submitResponse(dto.getId(), submit);
        surveyService.endSurvey(dto.getId());
        return dto.getId();
    }

    @Test
    void ended_anonymous_isDenied() throws Exception {
        mockMvc.perform(get("/api/survey-results"))
            .andExpect(status().isForbidden());
    }

    @Test
    void result_anonymous_isDenied() throws Exception {
        mockMvc.perform(get("/api/survey-results/1"))
            .andExpect(status().isForbidden());
    }

    @Test
    void result_normalUser_getsMemberFilteredResult() throws Exception {
        Long[] hiddenQuestionId = new Long[1];
        Long[] visibleQuestionId = new Long[1];
        Long surveyId = createEndedSurvey(hiddenQuestionId, visibleQuestionId);

        mockMvc.perform(get("/api/survey-results/" + surveyId)
                .with(SecurityMockMvcRequestPostProcessors.user("member").roles("NORMAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(surveyId.intValue()))
            .andExpect(jsonPath("$.status").value("BEENDET"))
            .andExpect(jsonPath("$.responseCount").value(1))
            .andExpect(jsonPath("$.questions.length()").value(1))
            .andExpect(jsonPath("$.questions[0].questionId").value(visibleQuestionId[0].intValue()))
            .andExpect(jsonPath("$.questions[0].text").value("Wie zufrieden?"))
            .andExpect(jsonPath("$.responses[0].answers.length()").value(1))
            .andExpect(jsonPath("$.responses[0].answers[0].questionId").value(visibleQuestionId[0].intValue()));
    }

    @Test
    void ended_normalUser_returnsOnlyBeendet() throws Exception {
        mockMvc.perform(get("/api/survey-results")
                .with(SecurityMockMvcRequestPostProcessors.user("member").roles("NORMAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    @Test
    void result_normalUser_gets400ForUnknownSurvey() throws Exception {
        mockMvc.perform(get("/api/survey-results/999999")
                .with(SecurityMockMvcRequestPostProcessors.user("member").roles("NORMAL")))
            .andExpect(status().isBadRequest());
    }

    @Test
    void adminResult_normalUser_isDenied() throws Exception {
        int status = mockMvc.perform(get("/api/surveys/999999/result")
                .with(SecurityMockMvcRequestPostProcessors.user("member").roles("NORMAL")))
            .andReturn().getResponse().getStatus();
        Assertions.assertThat(status).isNotEqualTo(HttpStatus.OK.value());
    }

    @Test
    void adminResult_admin_isAllowed() throws Exception {
        Long[] hiddenQuestionId = new Long[1];
        Long[] visibleQuestionId = new Long[1];
        Long surveyId = createEndedSurvey(hiddenQuestionId, visibleQuestionId);

        mockMvc.perform(get("/api/surveys/" + surveyId + "/result")
                .with(SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN", "NORMAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.questions.length()").value(2))
            .andExpect(jsonPath("$.questions[0].questionId").value(hiddenQuestionId[0].intValue()))
            .andExpect(jsonPath("$.responses[0].answers.length()").value(2));
    }
}
