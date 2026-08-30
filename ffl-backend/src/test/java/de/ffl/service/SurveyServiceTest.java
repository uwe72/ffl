package de.ffl.service;

import de.ffl.domain.QuestionType;
import de.ffl.domain.SurveyStatus;
import de.ffl.dto.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SurveyServiceTest extends AbstractSeasonTestBase {

    @Override
    protected boolean calculateSeasonInSetup() {
        return false;
    }

    @Autowired
    private SurveyService surveyService;

    private SurveyCreateRequest fullSurveyRequest() {
        SurveyCreateRequest req = new SurveyCreateRequest();
        req.setTitle("Saisonumfrage");
        req.setDescription("Beschreibung");

        SurveyQuestionRequest rating = new SurveyQuestionRequest();
        rating.setType(QuestionType.RATING);
        rating.setText("Wie zufrieden?");
        rating.setOrderIndex(0);
        rating.setRequired(true);

        SurveyQuestionRequest single = new SurveyQuestionRequest();
        single.setType(QuestionType.SINGLE);
        single.setText("Sollen Assists zählen?");
        single.setOrderIndex(1);
        single.setRequired(true);
        single.setOptions(List.of("Ja", "Nein"));

        SurveyQuestionRequest multi = new SurveyQuestionRequest();
        multi.setType(QuestionType.MULTI);
        multi.setText("Welche Themen?");
        multi.setOrderIndex(2);
        multi.setOptions(List.of("Punkte", "Geld", "Regeln"));

        SurveyQuestionRequest free = new SurveyQuestionRequest();
        free.setType(QuestionType.TEXTAREA);
        free.setText("Anregungen");
        free.setOrderIndex(3);

        req.setQuestions(List.of(rating, single, multi, free));
        return req;
    }

    private SurveyAdminDto createStartedSurvey() {
        SurveyAdminDto dto = surveyService.createSurvey(fullSurveyRequest());
        return surveyService.startSurvey(dto.getId());
    }

    private SurveyAnswerInput answer(Long questionId, List<Long> optionIds, String value) {
        SurveyAnswerInput in = new SurveyAnswerInput();
        in.setQuestionId(questionId);
        in.setOptionIds(optionIds);
        in.setValue(value);
        return in;
    }

    @Test
    void createSurvey_buildsQuestionsAndOptions() {
        SurveyAdminDto dto = surveyService.createSurvey(fullSurveyRequest());
        assertThat(dto.getStatus()).isEqualTo(SurveyStatus.ANGELEGT);
        assertThat(dto.getQuestions()).hasSize(4);
        assertThat(dto.getQuestions().get(1).getType()).isEqualTo(QuestionType.SINGLE);
        assertThat(dto.getQuestions().get(1).getOptions()).extracting(QuestionOptionDto::getText)
            .containsExactly("Ja", "Nein");
    }

    @Test
    void startSurvey_withoutQuestions_throws() {
        SurveyCreateRequest req = new SurveyCreateRequest();
        req.setTitle("Leer");
        SurveyAdminDto dto = surveyService.createSurvey(req);
        assertThatThrownBy(() -> surveyService.startSurvey(dto.getId()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("mindestens eine Frage");
    }

    @Test
    void startSurvey_blocksWhenAnotherStarted() {
        createStartedSurvey();
        SurveyAdminDto second = surveyService.createSurvey(fullSurveyRequest());
        assertThatThrownBy(() -> surveyService.startSurvey(second.getId()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("bereits eine Umfrage gestartet");
    }

    @Test
    void updateSurvey_afterStart_throws() {
        SurveyAdminDto dto = createStartedSurvey();
        SurveyCreateRequest update = fullSurveyRequest();
        update.setTitle("Neu");
        assertThatThrownBy(() -> surveyService.updateSurvey(dto.getId(), update))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("kann nicht mehr geändert");
    }

    @Test
    void submitResponse_requiresStartedStatus() {
        SurveyAdminDto dto = surveyService.createSurvey(fullSurveyRequest());
        SurveyAnswerRequest req = new SurveyAnswerRequest();
        req.setAnswers(List.of());
        assertThatThrownBy(() -> surveyService.submitResponse(dto.getId(), req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("nicht aktiv");
    }

    @Test
    void submitResponse_validatesRequiredField() {
        SurveyAdminDto dto = createStartedSurvey();
        Long ratingId = dto.getQuestions().get(0).getId();
        SurveyAnswerRequest req = new SurveyAnswerRequest();
        req.setAnswers(List.of(
            answer(ratingId, null, "4")
        ));
        assertThatThrownBy(() -> surveyService.submitResponse(dto.getId(), req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Pflichtfrage");
    }

    @Test
    void submitResponse_aggregatesResults() {
        SurveyAdminDto dto = createStartedSurvey();
        Long ratingId = dto.getQuestions().get(0).getId();
        Long singleId = dto.getQuestions().get(1).getId();
        Long multiId = dto.getQuestions().get(2).getId();
        Long freeId = dto.getQuestions().get(3).getId();
        Long singleYes = dto.getQuestions().get(1).getOptions().get(0).getId();
        Long singleNo = dto.getQuestions().get(1).getOptions().get(1).getId();
        Long multiPunkte = dto.getQuestions().get(2).getOptions().get(0).getId();
        Long multiGeld = dto.getQuestions().get(2).getOptions().get(1).getId();

        submit(dto.getId(), List.of(
            answer(ratingId, null, "4"),
            answer(singleId, List.of(singleYes), null),
            answer(multiId, List.of(multiPunkte, multiGeld), null),
            answer(freeId, null, "Mehr Transparenz")
        ));
        submit(dto.getId(), List.of(
            answer(ratingId, null, "2"),
            answer(singleId, List.of(singleNo), null),
            answer(multiId, List.of(multiPunkte), null),
            answer(freeId, null, null)
        ));

        SurveyResultDto result = surveyService.getResult(dto.getId());
        assertThat(result.getResponseCount()).isEqualTo(2);

        QuestionResult ratingResult = result.getQuestions().get(0);
        assertThat(ratingResult.getMean()).isEqualTo(3.0);
        assertThat(ratingResult.getRatingDistribution()).containsExactly(0, 1, 0, 1, 0);

        QuestionResult singleResult = result.getQuestions().get(1);
        assertThat(singleResult.getCounts()).extracting(OptionCount::getCount).containsExactly(1L, 1L);

        QuestionResult multiResult = result.getQuestions().get(2);
        assertThat(multiResult.getCounts()).extracting(OptionCount::getCount).containsExactly(2L, 1L, 0L);

        QuestionResult freeResult = result.getQuestions().get(3);
        assertThat(freeResult.getFreeTexts()).containsExactly("Mehr Transparenz");
        assertThat(result.getResponses()).hasSize(2);
    }

    @Test
    void publish_makesResultsPublicAndStripsFreeTexts() {
        SurveyAdminDto dto = createStartedSurvey();
        Long ratingId = dto.getQuestions().get(0).getId();
        Long singleId = dto.getQuestions().get(1).getId();
        Long freeId = dto.getQuestions().get(3).getId();
        submit(dto.getId(), List.of(
            answer(ratingId, null, "5"),
            answer(singleId, List.of(dto.getQuestions().get(1).getOptions().get(0).getId()), null),
            answer(freeId, null, "Geheim")
        ));

        assertThatThrownBy(() -> surveyService.getPublicResult(dto.getId()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("nicht veröffentlicht");

        surveyService.endSurvey(dto.getId());
        surveyService.publishSurvey(dto.getId());

        PublicSurveyResultDto publicResult = surveyService.getPublicResult(dto.getId());
        assertThat(publicResult.getStatus()).isEqualTo(SurveyStatus.VEROEFFENTLICHT);
        assertThat(publicResult.getResponseCount()).isEqualTo(1);
        QuestionResult freeResult = publicResult.getQuestions().get(3);
        assertThat(freeResult.getFreeTexts()).isNull();
    }

    @Test
    void getActiveSurvey_returnsStartedOrNull() {
        assertThat(surveyService.getActiveSurvey()).isNull();
        SurveyAdminDto dto = createStartedSurvey();
        assertThat(surveyService.getActiveSurvey().getId()).isEqualTo(dto.getId());
        surveyService.endSurvey(dto.getId());
        assertThat(surveyService.getActiveSurvey()).isNull();
    }

    @Test
    void endSurvey_requiresStarted() {
        SurveyAdminDto dto = surveyService.createSurvey(fullSurveyRequest());
        assertThatThrownBy(() -> surveyService.endSurvey(dto.getId()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Nur gestartete");
    }

    private void submit(Long surveyId, List<SurveyAnswerInput> answers) {
        SurveyAnswerRequest req = new SurveyAnswerRequest();
        req.setAnswers(answers);
        surveyService.submitResponse(surveyId, req);
    }

    @Test
    void textQuestions_applyDefaultMaxLength() {
        SurveyCreateRequest req = new SurveyCreateRequest();
        req.setTitle("Text");
        SurveyQuestionRequest tf = new SurveyQuestionRequest();
        tf.setType(QuestionType.TEXTFIELD);
        tf.setText("Kurztext");
        SurveyQuestionRequest ta = new SurveyQuestionRequest();
        ta.setType(QuestionType.TEXTAREA);
        ta.setText("Langtext");
        ta.setMaxLength(100);
        req.setQuestions(List.of(tf, ta));

        SurveyAdminDto dto = surveyService.createSurvey(req);
        assertThat(dto.getQuestions().get(0).getMaxLength()).isEqualTo(SurveyService.TEXTFIELD_MAX_LENGTH);
        assertThat(dto.getQuestions().get(1).getMaxLength()).isEqualTo(100);
    }

    @Test
    void textField_enforcesMaxLength() {
        SurveyCreateRequest req = new SurveyCreateRequest();
        req.setTitle("Kurz");
        SurveyQuestionRequest tf = new SurveyQuestionRequest();
        tf.setType(QuestionType.TEXTFIELD);
        tf.setText("Kurztext");
        tf.setRequired(true);
        req.setQuestions(List.of(tf));

        SurveyAdminDto dto = surveyService.createSurvey(req);
        surveyService.startSurvey(dto.getId());
        Long qid = dto.getQuestions().get(0).getId();

        assertThatThrownBy(() -> submit(dto.getId(),
            List.of(answer(qid, null, "x".repeat(SurveyService.TEXTFIELD_MAX_LENGTH + 1)))))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("maximal");

        submit(dto.getId(), List.of(answer(qid, null, "ok")));
        assertThat(surveyService.getResult(dto.getId()).getResponseCount()).isEqualTo(1);
    }
}
