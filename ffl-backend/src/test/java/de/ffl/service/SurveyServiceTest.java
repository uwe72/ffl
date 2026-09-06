package de.ffl.service;

import de.ffl.domain.QuestionType;
import de.ffl.domain.SurveyStatus;
import de.ffl.dto.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
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
        req.setDeadline(LocalDateTime.now().plusDays(30));

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
    void createSurvey_withoutRequiredQuestion_throws() {
        SurveyCreateRequest req = new SurveyCreateRequest();
        req.setTitle("Leer");
        req.setDeadline(LocalDateTime.now().plusDays(30));
        SurveyQuestionRequest optional = new SurveyQuestionRequest();
        optional.setType(QuestionType.TEXTAREA);
        optional.setText("Optional");
        optional.setRequired(false);
        req.setQuestions(List.of(optional));
        assertThatThrownBy(() -> surveyService.createSurvey(req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("mindestens eine Pflichtfrage");
    }

    @Test
    void createSurvey_withoutQuestions_throws() {
        SurveyCreateRequest req = new SurveyCreateRequest();
        req.setTitle("Leer");
        req.setDeadline(LocalDateTime.now().plusDays(30));
        assertThatThrownBy(() -> surveyService.createSurvey(req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("mindestens eine Pflichtfrage");
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

    @Test
    void resetSurvey_movesGestartetToAngelegt() {
        SurveyAdminDto dto = createStartedSurvey();
        assertThat(surveyService.getActiveSurvey().getId()).isEqualTo(dto.getId());

        SurveyAdminDto reset = surveyService.resetSurvey(dto.getId());

        assertThat(reset.getStatus()).isEqualTo(SurveyStatus.ANGELEGT);
        assertThat(surveyService.getActiveSurvey()).isNull();
        assertThat(surveyService.getAdminSurvey(dto.getId()).getStatus()).isEqualTo(SurveyStatus.ANGELEGT);
        assertThat(surveyService.getAdminSurvey(dto.getId()).getQuestions()).hasSize(dto.getQuestions().size());
    }

    @Test
    void resetSurvey_movesBeendetToAngelegt() {
        SurveyAdminDto dto = createStartedSurvey();
        surveyService.endSurvey(dto.getId());

        SurveyAdminDto reset = surveyService.resetSurvey(dto.getId());

        assertThat(reset.getStatus()).isEqualTo(SurveyStatus.ANGELEGT);
        assertThat(surveyService.getAdminSurvey(dto.getId()).getStatus()).isEqualTo(SurveyStatus.ANGELEGT);
    }

    @Test
    void resetSurvey_withResponses_throws() {
        SurveyAdminDto dto = createStartedSurvey();
        Long ratingId = dto.getQuestions().get(0).getId();
        Long singleId = dto.getQuestions().get(1).getId();
        Long singleYes = dto.getQuestions().get(1).getOptions().get(0).getId();
        submit(dto.getId(), List.of(answer(ratingId, null, "4"), answer(singleId, List.of(singleYes), null)));

        assertThatThrownBy(() -> surveyService.resetSurvey(dto.getId()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("bereits Antworten");
        assertThat(surveyService.getAdminSurvey(dto.getId()).getStatus()).isEqualTo(SurveyStatus.GESTARTET);
    }

    @Test
    void resetSurvey_requiresGestartetOrBeendet() {
        SurveyAdminDto dto = surveyService.createSurvey(fullSurveyRequest());
        assertThatThrownBy(() -> surveyService.resetSurvey(dto.getId()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Nur gestartete oder beendete");
    }

    @Test
    void reopenSurvey_movesBeendetBackToGestartet() {
        SurveyAdminDto dto = createStartedSurvey();
        surveyService.endSurvey(dto.getId());
        assertThat(surveyService.getAdminSurvey(dto.getId()).getStatus()).isEqualTo(SurveyStatus.BEENDET);

        surveyService.reopenSurvey(dto.getId(), null);

        assertThat(surveyService.getAdminSurvey(dto.getId()).getStatus()).isEqualTo(SurveyStatus.GESTARTET);
        assertThat(surveyService.getActiveSurvey().getId()).isEqualTo(dto.getId());
    }

    @Test
    void reopenSurvey_requiresBeendet() {
        SurveyAdminDto dto = createStartedSurvey();
        assertThatThrownBy(() -> surveyService.reopenSurvey(dto.getId(), null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Nur beendete");
    }

    @Test
    void reopenSurvey_blocksWhenAnotherStarted() {
        SurveyAdminDto a = createStartedSurvey();
        surveyService.endSurvey(a.getId());
        SurveyAdminDto b = surveyService.createSurvey(fullSurveyRequest());
        surveyService.startSurvey(b.getId());

        assertThatThrownBy(() -> surveyService.reopenSurvey(a.getId(), null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("bereits eine Umfrage gestartet");
    }

    @Test
    void reopenSurvey_requiresFutureDeadline() {
        SurveyAdminDto dto = createStartedSurvey();
        entityManager.createNativeQuery("UPDATE ffl_survey SET deadline = :past WHERE id = :id")
            .setParameter("past", LocalDateTime.now().minusMinutes(5))
            .setParameter("id", dto.getId())
            .executeUpdate();
        entityManager.flush();
        entityManager.clear();
        surveyService.endSurvey(dto.getId());

        assertThatThrownBy(() -> surveyService.reopenSurvey(dto.getId(), null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Zukunft");
    }

    @Test
    void reopenSurvey_withNewDeadline_reactivatesExpiredSurvey() {
        SurveyAdminDto dto = createStartedSurvey();
        entityManager.createNativeQuery("UPDATE ffl_survey SET deadline = :past WHERE id = :id")
            .setParameter("past", LocalDateTime.now().minusMinutes(5))
            .setParameter("id", dto.getId())
            .executeUpdate();
        entityManager.flush();
        entityManager.clear();
        surveyService.endSurvey(dto.getId());

        LocalDateTime newDeadline = LocalDateTime.now().plusDays(14);
        SurveyAdminDto reopened = surveyService.reopenSurvey(dto.getId(), newDeadline);

        assertThat(reopened.getStatus()).isEqualTo(SurveyStatus.GESTARTET);
        assertThat(reopened.getDeadline()).isEqualTo(newDeadline);
        assertThat(surveyService.getActiveSurvey().getId()).isEqualTo(dto.getId());
    }

    @Test
    void reopenSurvey_withPastNewDeadline_throws() {
        SurveyAdminDto dto = createStartedSurvey();
        surveyService.endSurvey(dto.getId());

        assertThatThrownBy(() -> surveyService.reopenSurvey(dto.getId(), LocalDateTime.now().minusDays(1)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Zukunft");
        assertThat(surveyService.getAdminSurvey(dto.getId()).getStatus()).isEqualTo(SurveyStatus.BEENDET);
    }

    @Test
    void updateSurveyMeta_onBeendet_updatesTitleDescriptionDeadline() {
        SurveyAdminDto dto = createStartedSurvey();
        surveyService.endSurvey(dto.getId());

        SurveyMetaUpdateRequest req = new SurveyMetaUpdateRequest();
        req.setTitle("Neuer Titel");
        req.setDescription("Neue Beschreibung");
        req.setDeadline(LocalDateTime.now().plusDays(21));
        SurveyAdminDto updated = surveyService.updateSurveyMeta(dto.getId(), req);

        assertThat(updated.getTitle()).isEqualTo("Neuer Titel");
        assertThat(updated.getDescription()).isEqualTo("Neue Beschreibung");
        assertThat(updated.getDeadline()).isEqualTo(req.getDeadline());
        assertThat(updated.getQuestions()).hasSize(dto.getQuestions().size());
        assertThat(updated.getResponseCount()).isZero();
    }

    @Test
    void updateSurveyMeta_requiresBeendetOrGestartet() {
        SurveyAdminDto angelegt = surveyService.createSurvey(fullSurveyRequest());

        SurveyMetaUpdateRequest req = new SurveyMetaUpdateRequest();
        req.setTitle("Neu");
        req.setDeadline(LocalDateTime.now().plusDays(7));

        assertThatThrownBy(() -> surveyService.updateSurveyMeta(angelegt.getId(), req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Nur gestartete oder beendete");
    }

    @Test
    void updateSurveyMeta_onGestartet_updatesDeadlineAndTitle() {
        SurveyAdminDto dto = createStartedSurvey();

        SurveyMetaUpdateRequest req = new SurveyMetaUpdateRequest();
        req.setTitle("Neuer Titel");
        req.setDescription("Neue Beschreibung");
        req.setDeadline(LocalDateTime.now().plusDays(45));
        SurveyAdminDto updated = surveyService.updateSurveyMeta(dto.getId(), req);

        assertThat(updated.getTitle()).isEqualTo("Neuer Titel");
        assertThat(updated.getDescription()).isEqualTo("Neue Beschreibung");
        assertThat(updated.getDeadline()).isEqualTo(req.getDeadline());
        assertThat(updated.getStatus()).isEqualTo(SurveyStatus.GESTARTET);
        assertThat(updated.getQuestions()).hasSize(dto.getQuestions().size());
    }

    @Test
    void updateSurveyMeta_onGestartet_pastDeadline_throws() {
        SurveyAdminDto dto = createStartedSurvey();

        SurveyMetaUpdateRequest req = new SurveyMetaUpdateRequest();
        req.setTitle("Neu");
        req.setDeadline(LocalDateTime.now().minusDays(1));

        assertThatThrownBy(() -> surveyService.updateSurveyMeta(dto.getId(), req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Zukunft");
        assertThat(surveyService.getAdminSurvey(dto.getId()).getStatus()).isEqualTo(SurveyStatus.GESTARTET);
    }

    @Test
    void updateSurveyMeta_requiresDeadline() {
        SurveyAdminDto dto = createStartedSurvey();
        surveyService.endSurvey(dto.getId());

        SurveyMetaUpdateRequest req = new SurveyMetaUpdateRequest();
        req.setTitle("Neu");
        assertThatThrownBy(() -> surveyService.updateSurveyMeta(dto.getId(), req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Zieldatum");
    }

    @Test
    void createSurvey_separatorForcesOptionalAndNoOptions() {
        SurveyCreateRequest req = new SurveyCreateRequest();
        req.setTitle("Gruppenumfrage");
        req.setDeadline(LocalDateTime.now().plusDays(30));
        SurveyQuestionRequest separator = new SurveyQuestionRequest();
        separator.setType(QuestionType.SEPARATOR);
        separator.setText("Abschnitt 1");
        separator.setRequired(true);
        separator.setMaxLength(100);
        separator.setOptions(List.of("SollIgnoriertWerden"));
        SurveyQuestionRequest rating = new SurveyQuestionRequest();
        rating.setType(QuestionType.RATING);
        rating.setText("Wie zufrieden?");
        rating.setRequired(true);
        req.setQuestions(List.of(separator, rating));

        SurveyAdminDto dto = surveyService.createSurvey(req);
        SurveyQuestionAdminDto sep = dto.getQuestions().get(0);
        assertThat(sep.getType()).isEqualTo(QuestionType.SEPARATOR);
        assertThat(sep.getRequired()).isFalse();
        assertThat(sep.getMaxLength()).isNull();
        assertThat(sep.getOptions()).isEmpty();
    }

    @Test
    void separator_skipsAnswersAndResultStats() {
        SurveyCreateRequest req = new SurveyCreateRequest();
        req.setTitle("Gruppenumfrage");
        req.setDeadline(LocalDateTime.now().plusDays(30));
        SurveyQuestionRequest separator = new SurveyQuestionRequest();
        separator.setType(QuestionType.SEPARATOR);
        separator.setText("Abschnitt 1");
        SurveyQuestionRequest rating = new SurveyQuestionRequest();
        rating.setType(QuestionType.RATING);
        rating.setText("Wie zufrieden?");
        rating.setRequired(true);
        req.setQuestions(List.of(separator, rating));

        SurveyAdminDto dto = surveyService.startSurvey(surveyService.createSurvey(req).getId());
        Long separatorId = dto.getQuestions().get(0).getId();
        Long ratingId = dto.getQuestions().get(1).getId();

        submit(dto.getId(), List.of(answer(ratingId, null, "3")));
        SurveyResultDto result = surveyService.getResult(dto.getId());

        assertThat(result.getResponseCount()).isEqualTo(1);
        QuestionResult sepResult = result.getQuestions().get(0);
        assertThat(sepResult.getType()).isEqualTo(QuestionType.SEPARATOR);
        assertThat(sepResult.getText()).isEqualTo("Abschnitt 1");
        assertThat(sepResult.getMean()).isNull();
        assertThat(sepResult.getRatingDistribution()).isNull();
        assertThat(sepResult.getCounts()).isNull();
        assertThat(sepResult.getFreeTexts()).isNull();
        assertThat(sepResult.getAnswerCount()).isNull();
        assertThat(result.getResponses().get(0).getAnswers())
            .extracting(AnswerDetailDto::getQuestionId)
            .doesNotContain(separatorId);
    }

    @Test
    void copySurvey_keepsSeparatorType() {
        SurveyCreateRequest req = new SurveyCreateRequest();
        req.setTitle("Gruppenumfrage");
        req.setDeadline(LocalDateTime.now().plusDays(30));
        SurveyQuestionRequest separator = new SurveyQuestionRequest();
        separator.setType(QuestionType.SEPARATOR);
        separator.setText("Abschnitt 1");
        SurveyQuestionRequest rating = new SurveyQuestionRequest();
        rating.setType(QuestionType.RATING);
        rating.setText("Wie zufrieden?");
        rating.setRequired(true);
        req.setQuestions(List.of(separator, rating));

        SurveyAdminDto dto = surveyService.createSurvey(req);
        SurveyAdminDto copy = surveyService.copySurvey(dto.getId());
        assertThat(copy.getQuestions().get(0).getType()).isEqualTo(QuestionType.SEPARATOR);
        assertThat(copy.getQuestions().get(0).getText()).isEqualTo("Abschnitt 1");
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
        req.setDeadline(LocalDateTime.now().plusDays(30));
        SurveyQuestionRequest tf = new SurveyQuestionRequest();
        tf.setType(QuestionType.TEXTFIELD);
        tf.setText("Kurztext");
        tf.setRequired(true);
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
        req.setDeadline(LocalDateTime.now().plusDays(30));
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

    @Test
    void copySurvey_createsAngelegtCopyWithQuestions() {
        SurveyAdminDto dto = createStartedSurvey();
        SurveyAdminDto copy = surveyService.copySurvey(dto.getId());
        assertThat(copy.getId()).isNotEqualTo(dto.getId());
        assertThat(copy.getTitle()).isEqualTo("Kopie von " + dto.getTitle());
        assertThat(copy.getStatus()).isEqualTo(SurveyStatus.ANGELEGT);
        assertThat(copy.getQuestions()).hasSize(dto.getQuestions().size());
        assertThat(copy.getQuestions().get(1).getType()).isEqualTo(QuestionType.SINGLE);
        assertThat(copy.getQuestions().get(1).getOptions()).extracting(QuestionOptionDto::getText)
            .containsExactly("Ja", "Nein");
        assertThat(copy.getResponseCount()).isZero();
    }

    @Test
    void deleteSurvey_deletesStartedSurveyWithResponses() {
        SurveyAdminDto dto = createStartedSurvey();
        Long ratingId = dto.getQuestions().get(0).getId();
        Long singleId = dto.getQuestions().get(1).getId();
        Long singleYes = dto.getQuestions().get(1).getOptions().get(0).getId();
        submit(dto.getId(), List.of(answer(ratingId, null, "4"), answer(singleId, List.of(singleYes), null)));
        assertThat(surveyService.getResult(dto.getId()).getResponseCount()).isEqualTo(1);

        surveyService.deleteSurvey(dto.getId());

        assertThat(surveyService.listSurveys()).extracting(SurveyAdminDto::getId).doesNotContain(dto.getId());
        assertThatThrownBy(() -> surveyService.getAdminSurvey(dto.getId()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("nicht gefunden");
    }

    @Test
    void deleteResponse_removesSingleResponseAndUpdateCounts() {
        SurveyAdminDto dto = createStartedSurvey();
        Long ratingId = dto.getQuestions().get(0).getId();
        Long singleId = dto.getQuestions().get(1).getId();
        Long singleYes = dto.getQuestions().get(1).getOptions().get(0).getId();
        submit(dto.getId(), List.of(answer(ratingId, null, "5"), answer(singleId, List.of(singleYes), null)));
        submit(dto.getId(), List.of(answer(ratingId, null, "3"), answer(singleId, List.of(singleYes), null)));

        SurveyResultDto result = surveyService.getResult(dto.getId());
        assertThat(result.getResponseCount()).isEqualTo(2);
        Long responseId = result.getResponses().get(0).getId();
        assertThat(responseId).isNotNull();

        surveyService.deleteResponse(dto.getId(), responseId);

        SurveyResultDto after = surveyService.getResult(dto.getId());
        assertThat(after.getResponseCount()).isEqualTo(1);
        assertThat(after.getResponses()).extracting(SurveyResponseDetailDto::getId).doesNotContain(responseId);
        assertThat(after.getQuestions().get(0).getMean()).isEqualTo(3.0);
        assertThat(after.getQuestions().get(0).getRatingDistribution()).containsExactly(0, 0, 1, 0, 0);
    }

    @Test
    void deleteResponse_withForeignSurvey_throws() {
        SurveyAdminDto first = createStartedSurvey();
        Long ratingId = first.getQuestions().get(0).getId();
        Long singleId = first.getQuestions().get(1).getId();
        Long singleYes = first.getQuestions().get(1).getOptions().get(0).getId();
        submit(first.getId(), List.of(answer(ratingId, null, "4"), answer(singleId, List.of(singleYes), null)));
        Long responseId = surveyService.getResult(first.getId()).getResponses().get(0).getId();

        surveyService.endSurvey(first.getId());
        SurveyAdminDto second = surveyService.createSurvey(fullSurveyRequest());
        surveyService.startSurvey(second.getId());

        assertThatThrownBy(() -> surveyService.deleteResponse(second.getId(), responseId))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("gehört nicht zu dieser Umfrage");
        assertThat(surveyService.getResult(first.getId()).getResponseCount()).isEqualTo(1);
    }

    @Test
    void deleteResponse_withUnknownId_throws() {
        SurveyAdminDto dto = createStartedSurvey();
        assertThatThrownBy(() -> surveyService.deleteResponse(dto.getId(), 999999L))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Antwort nicht gefunden");
    }

    @Test
    void deleteSurvey_deletesBeendetAndVeroeffentlicht() {
        SurveyAdminDto dto = createStartedSurvey();
        surveyService.endSurvey(dto.getId());
        surveyService.deleteSurvey(dto.getId());
        assertThat(surveyService.listSurveys()).extracting(SurveyAdminDto::getId).doesNotContain(dto.getId());
    }

    @Test
    void deleteSurvey_clearsActiveSurveyAndFreesStartedSlot() {
        SurveyAdminDto dto = createStartedSurvey();
        assertThat(surveyService.getActiveSurvey().getId()).isEqualTo(dto.getId());

        surveyService.deleteSurvey(dto.getId());

        assertThat(surveyService.getActiveSurvey()).isNull();
        SurveyAdminDto replacement = surveyService.createSurvey(fullSurveyRequest());
        assertThat(surveyService.startSurvey(replacement.getId()).getStatus()).isEqualTo(SurveyStatus.GESTARTET);
    }

    @Test
    void createSurvey_requiresDeadline() {
        SurveyCreateRequest req = new SurveyCreateRequest();
        req.setTitle("Ohne Frist");
        assertThatThrownBy(() -> surveyService.createSurvey(req))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Zieldatum");
    }

    @Test
    void createSurvey_storesDeadline() {
        SurveyCreateRequest req = fullSurveyRequest();
        req.setDeadline(LocalDateTime.now().plusDays(10));
        SurveyAdminDto dto = surveyService.createSurvey(req);
        assertThat(dto.getDeadline()).isEqualTo(req.getDeadline());
        assertThat(surveyService.getPublicSurvey(dto.getId()).getDeadline()).isEqualTo(req.getDeadline());
    }

    @Test
    void startSurvey_requiresFutureDeadline() {
        SurveyCreateRequest req = fullSurveyRequest();
        req.setDeadline(LocalDateTime.now().minusDays(1));
        SurveyAdminDto dto = surveyService.createSurvey(req);
        assertThatThrownBy(() -> surveyService.startSurvey(dto.getId()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Zukunft");
    }

    @Test
    void endExpiredSurveys_autoEndsAndBlocksSubmission() {
        SurveyAdminDto dto = createStartedSurvey();
        entityManager.createNativeQuery("UPDATE ffl_survey SET deadline = :past WHERE id = :id")
            .setParameter("past", LocalDateTime.now().minusMinutes(5))
            .setParameter("id", dto.getId())
            .executeUpdate();
        entityManager.flush();
        entityManager.clear();

        assertThat(surveyService.endExpiredSurveys()).isEqualTo(1);
        assertThat(surveyService.getAdminSurvey(dto.getId()).getStatus()).isEqualTo(SurveyStatus.BEENDET);

        assertThatThrownBy(() -> submit(dto.getId(), List.of()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("nicht aktiv");
    }

    @Test
    void submitResponse_blockedAfterDeadline() {
        SurveyAdminDto dto = createStartedSurvey();
        entityManager.createNativeQuery("UPDATE ffl_survey SET deadline = :past WHERE id = :id")
            .setParameter("past", LocalDateTime.now().minusMinutes(5))
            .setParameter("id", dto.getId())
            .executeUpdate();
        entityManager.flush();
        entityManager.clear();

        assertThatThrownBy(() -> submit(dto.getId(), List.of()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("abgelaufen");
    }
}
