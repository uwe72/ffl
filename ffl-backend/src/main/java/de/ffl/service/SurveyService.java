package de.ffl.service;

import de.ffl.domain.*;
import de.ffl.dto.*;
import de.ffl.repository.SurveyRepository;
import de.ffl.repository.SurveyResponseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SurveyService {

    public static final int TEXTFIELD_MAX_LENGTH = 255;
    public static final int TEXTAREA_MAX_LENGTH = 4000;

    private final SurveyRepository surveyRepository;
    private final SurveyResponseRepository surveyResponseRepository;
    private final SurveyNotificationService surveyNotificationService;

    public SurveyService(SurveyRepository surveyRepository,
                         SurveyResponseRepository surveyResponseRepository,
                         SurveyNotificationService surveyNotificationService) {
        this.surveyRepository = surveyRepository;
        this.surveyResponseRepository = surveyResponseRepository;
        this.surveyNotificationService = surveyNotificationService;
    }

    @Transactional
    public SurveyAdminDto createSurvey(SurveyCreateRequest request) {
        Survey survey = Survey.builder()
            .title(request.getTitle())
            .description(request.getDescription())
            .status(SurveyStatus.ANGELEGT)
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
            .build();
        applyQuestions(survey, request.getQuestions());
        Survey saved = surveyRepository.save(survey);
        return toAdminDto(saved, 0);
    }

    @Transactional
    public SurveyAdminDto updateSurvey(Long id, SurveyCreateRequest request) {
        Survey survey = requireSurvey(id);
        if (survey.getStatus() != SurveyStatus.ANGELEGT) {
            throw new IllegalArgumentException("Umfrage ist bereits gestartet und kann nicht mehr geändert werden");
        }
        survey.setTitle(request.getTitle());
        survey.setDescription(request.getDescription());
        survey.setUpdatedAt(LocalDateTime.now());
        survey.getQuestions().clear();
        applyQuestions(survey, request.getQuestions());
        Survey saved = surveyRepository.save(survey);
        return toAdminDto(saved, 0);
    }

    @Transactional
    public SurveyAdminDto reviseSurvey(Long id, SurveyCreateRequest request) {
        Survey survey = requireSurvey(id);
        if (survey.getStatus() != SurveyStatus.GESTARTET) {
            throw new IllegalArgumentException("Nur gestartete Umfragen können überarbeitet werden");
        }
        if (request.getQuestions() == null || request.getQuestions().isEmpty()) {
            throw new IllegalArgumentException("Die Umfrage benötigt mindestens eine Frage");
        }
        surveyResponseRepository.deleteBySurveyId(id);
        survey.setTitle(request.getTitle());
        survey.setDescription(request.getDescription());
        survey.setUpdatedAt(LocalDateTime.now());
        survey.getQuestions().clear();
        applyQuestions(survey, request.getQuestions());
        Survey saved = surveyRepository.save(survey);
        return toAdminDto(saved, 0);
    }

    @Transactional
    public SurveyAdminDto copySurvey(Long id) {
        Survey source = requireSurvey(id);
        SurveyCreateRequest request = new SurveyCreateRequest();
        request.setTitle("Kopie von " + source.getTitle());
        request.setDescription(source.getDescription());
        request.setQuestions(source.getQuestions().stream()
            .map(q -> {
                SurveyQuestionRequest qr = new SurveyQuestionRequest();
                qr.setType(q.getType());
                qr.setText(q.getText());
                qr.setOrderIndex(q.getOrderIndex());
                qr.setRequired(q.getRequired());
                qr.setMaxLength(q.getMaxLength());
                qr.setOptions(q.getOptions().stream()
                    .map(QuestionOption::getText)
                    .toList());
                return qr;
            })
            .toList());
        return createSurvey(request);
    }

    @Transactional
    public void deleteSurvey(Long id) {
        Survey survey = requireSurvey(id);
        if (survey.getStatus() != SurveyStatus.ANGELEGT) {
            throw new IllegalArgumentException("Nur angelegte Umfragen können gelöscht werden");
        }
        surveyRepository.delete(survey);
    }

    @Transactional
    public SurveyAdminDto startSurvey(Long id) {
        Survey survey = requireSurvey(id);
        if (survey.getStatus() != SurveyStatus.ANGELEGT) {
            throw new IllegalArgumentException("Nur angelegte Umfragen können gestartet werden");
        }
        if (survey.getQuestions().isEmpty()) {
            throw new IllegalArgumentException("Die Umfrage benötigt mindestens eine Frage");
        }
        if (surveyRepository.existsByStatus(SurveyStatus.GESTARTET)) {
            throw new IllegalArgumentException("Es ist bereits eine Umfrage gestartet. Beende sie zuerst.");
        }
        survey.setStatus(SurveyStatus.GESTARTET);
        survey.setUpdatedAt(LocalDateTime.now());
        return toAdminDto(surveyRepository.save(survey), 0);
    }

    @Transactional
    public SurveyAdminDto endSurvey(Long id) {
        Survey survey = requireSurvey(id);
        if (survey.getStatus() != SurveyStatus.GESTARTET) {
            throw new IllegalArgumentException("Nur gestartete Umfragen können beendet werden");
        }
        survey.setStatus(SurveyStatus.BEENDET);
        survey.setUpdatedAt(LocalDateTime.now());
        return toAdminDto(surveyRepository.save(survey), surveyResponseRepository.countBySurveyId(id));
    }

    @Transactional
    public SurveyAdminDto publishSurvey(Long id) {
        Survey survey = requireSurvey(id);
        if (survey.getStatus() != SurveyStatus.BEENDET) {
            throw new IllegalArgumentException("Nur beendete Umfragen können veröffentlicht werden");
        }
        survey.setStatus(SurveyStatus.VEROEFFENTLICHT);
        survey.setUpdatedAt(LocalDateTime.now());
        return toAdminDto(surveyRepository.save(survey), surveyResponseRepository.countBySurveyId(id));
    }

    @Transactional(readOnly = true)
    public List<SurveyAdminDto> listSurveys() {
        return surveyRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(s -> toAdminDto(s, surveyResponseRepository.countBySurveyId(s.getId())))
            .toList();
    }

    @Transactional(readOnly = true)
    public SurveyAdminDto getAdminSurvey(Long id) {
        Survey survey = requireSurvey(id);
        return toAdminDto(survey, surveyResponseRepository.countBySurveyId(id));
    }

    @Transactional(readOnly = true)
    public SurveyPublicDto getPublicSurvey(Long id) {
        Survey survey = requireSurvey(id);
        return toPublicDto(survey);
    }

    @Transactional(readOnly = true)
    public SurveyPublicDto getActiveSurvey() {
        return surveyRepository.findFirstByStatus(SurveyStatus.GESTARTET)
            .map(this::toPublicDto)
            .orElse(null);
    }

    private SurveyPublicDto toPublicDto(Survey survey) {
        return SurveyPublicDto.builder()
            .id(survey.getId())
            .title(survey.getTitle())
            .description(survey.getDescription())
            .status(survey.getStatus())
            .questions(survey.getQuestions().stream()
                .map(q -> SurveyQuestionPublicDto.builder()
                    .id(q.getId())
                    .type(q.getType())
                    .text(q.getText())
                    .orderIndex(q.getOrderIndex())
                    .required(q.getRequired())
                    .maxLength(q.getMaxLength())
                    .options(q.getOptions().stream()
                        .map(o -> QuestionOptionDto.builder()
                            .id(o.getId())
                            .text(o.getText())
                            .orderIndex(o.getOrderIndex())
                            .build())
                        .toList())
                    .build())
                .toList())
            .build();
    }

    @Transactional
    public void submitResponse(Long surveyId, SurveyAnswerRequest request) {
        Survey survey = requireSurvey(surveyId);
        if (survey.getStatus() != SurveyStatus.GESTARTET) {
            throw new IllegalArgumentException("Die Umfrage ist nicht aktiv und kann nicht ausgefüllt werden");
        }

        Map<Long, Question> questionsById = survey.getQuestions().stream()
            .collect(Collectors.toMap(Question::getId, Function.identity()));
        Map<Long, SurveyAnswerInput> inputByQuestion = request.getAnswers() == null ? Map.of()
            : request.getAnswers().stream()
                .filter(a -> a.getQuestionId() != null)
                .collect(Collectors.toMap(SurveyAnswerInput::getQuestionId, Function.identity(), (a, b) -> a));

        SurveyResponse response = SurveyResponse.builder()
            .survey(survey)
            .submittedAt(LocalDateTime.now())
            .answers(new ArrayList<>())
            .build();

        for (Question q : survey.getQuestions()) {
            SurveyAnswerInput input = inputByQuestion.get(q.getId());
            buildAnswer(q, input, response);
        }

        SurveyResponse saved = surveyResponseRepository.save(response);
        surveyNotificationService.notifyAdmin(survey, toResponseDetail(saved));
    }

    @Transactional(readOnly = true)
    public SurveyResultDto getResult(Long surveyId) {
        Survey survey = requireSurvey(surveyId);
        long responseCount = surveyResponseRepository.countBySurveyId(surveyId);
        List<SurveyResponse> responses = surveyResponseRepository.findBySurveyIdWithAnswers(surveyId);

        List<QuestionResult> questions = survey.getQuestions().stream()
            .map(q -> buildQuestionResult(q, responses, true))
            .toList();
        List<SurveyResponseDetailDto> detail = responses.stream()
            .map(this::toResponseDetail)
            .toList();

        return SurveyResultDto.builder()
            .id(survey.getId())
            .title(survey.getTitle())
            .description(survey.getDescription())
            .status(survey.getStatus())
            .createdAt(survey.getCreatedAt())
            .updatedAt(survey.getUpdatedAt())
            .responseCount(responseCount)
            .questions(questions)
            .responses(detail)
            .build();
    }

    @Transactional(readOnly = true)
    public PublicSurveyResultDto getPublicResult(Long surveyId) {
        Survey survey = requireSurvey(surveyId);
        if (survey.getStatus() != SurveyStatus.VEROEFFENTLICHT) {
            throw new IllegalArgumentException("Die Ergebnisse dieser Umfrage sind nicht veröffentlicht");
        }
        long responseCount = surveyResponseRepository.countBySurveyId(surveyId);
        List<SurveyResponse> responses = surveyResponseRepository.findBySurveyIdWithAnswers(surveyId);
        List<QuestionResult> questions = survey.getQuestions().stream()
            .map(q -> buildQuestionResult(q, responses, false))
            .toList();

        return PublicSurveyResultDto.builder()
            .id(survey.getId())
            .title(survey.getTitle())
            .description(survey.getDescription())
            .status(survey.getStatus())
            .responseCount(responseCount)
            .questions(questions)
            .build();
    }

    private void applyQuestions(Survey survey, List<SurveyQuestionRequest> questionRequests) {
        if (questionRequests == null) {
            return;
        }
        int qi = 0;
        for (SurveyQuestionRequest r : questionRequests) {
            QuestionType type = r.getType() == null ? QuestionType.TEXTAREA : r.getType();
            Question q = Question.builder()
                .survey(survey)
                .type(type)
                .text(r.getText())
                .orderIndex(r.getOrderIndex() != null ? r.getOrderIndex() : qi)
                .required(r.getRequired() != null ? r.getRequired() : false)
                .maxLength(r.getMaxLength() != null ? r.getMaxLength() : defaultMaxLength(type))
                .options(new ArrayList<>())
                .build();
            if (r.getOptions() != null) {
                int oi = 0;
                for (String optionText : r.getOptions()) {
                    if (optionText == null || optionText.isBlank()) continue;
                    q.getOptions().add(QuestionOption.builder()
                        .question(q)
                        .text(optionText.trim())
                        .orderIndex(oi)
                        .build());
                    oi++;
                }
            }
            survey.getQuestions().add(q);
            qi++;
        }
    }

    private void buildAnswer(Question q, SurveyAnswerInput input, SurveyResponse response) {
        switch (q.getType()) {
            case RATING -> {
                if (input == null || input.getValue() == null || input.getValue().isBlank()) {
                    if (Boolean.TRUE.equals(q.getRequired())) {
                        throw new IllegalArgumentException("Pflichtfrage: " + q.getText());
                    }
                    return;
                }
                int rating;
                try {
                    rating = Integer.parseInt(input.getValue().trim());
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("Ungültige Bewertung für Frage: " + q.getText());
                }
                if (rating < 1 || rating > 5) {
                    throw new IllegalArgumentException("Bewertung muss zwischen 1 und 5 liegen: " + q.getText());
                }
                response.getAnswers().add(Answer.builder()
                    .surveyResponse(response).question(q).value(String.valueOf(rating)).build());
            }
            case SINGLE -> buildSingleAnswer(q, input, response);
            case MULTI -> buildMultiAnswer(q, input, response);
            case TEXTFIELD, TEXTAREA -> {
                if (input == null || input.getValue() == null || input.getValue().isBlank()) {
                    if (Boolean.TRUE.equals(q.getRequired())) {
                        throw new IllegalArgumentException("Pflichtfrage: " + q.getText());
                    }
                    return;
                }
                String value = input.getValue().trim();
                int maxLength = q.getMaxLength() != null ? q.getMaxLength() : defaultMaxLength(q.getType());
                if (value.length() > maxLength) {
                    throw new IllegalArgumentException("Antwort für Frage \"" + q.getText() + "\" darf maximal "
                        + maxLength + " Zeichen lang sein");
                }
                response.getAnswers().add(Answer.builder()
                    .surveyResponse(response).question(q).value(value).build());
            }
        }
    }

    private int defaultMaxLength(QuestionType type) {
        return type == QuestionType.TEXTFIELD ? TEXTFIELD_MAX_LENGTH : TEXTAREA_MAX_LENGTH;
    }

    private void buildSingleAnswer(Question q, SurveyAnswerInput input, SurveyResponse response) {
        List<Long> optionIds = input == null ? null : input.getOptionIds();
        if (optionIds == null || optionIds.isEmpty()) {
            if (Boolean.TRUE.equals(q.getRequired())) {
                throw new IllegalArgumentException("Pflichtfrage: " + q.getText());
            }
            return;
        }
        if (optionIds.size() != 1) {
            throw new IllegalArgumentException("Bitte genau eine Option wählen: " + q.getText());
        }
        Long optionId = optionIds.get(0);
        if (!optionBelongsTo(optionId, q)) {
            throw new IllegalArgumentException("Ungültige Option für Frage: " + q.getText());
        }
        response.getAnswers().add(Answer.builder()
            .surveyResponse(response).question(q).optionId(optionId).build());
    }

    private void buildMultiAnswer(Question q, SurveyAnswerInput input, SurveyResponse response) {
        List<Long> optionIds = input == null ? null : input.getOptionIds();
        if (optionIds == null || optionIds.isEmpty()) {
            if (Boolean.TRUE.equals(q.getRequired())) {
                throw new IllegalArgumentException("Pflichtfrage: " + q.getText());
            }
            return;
        }
        List<Long> distinct = optionIds.stream().distinct().toList();
        for (Long optionId : distinct) {
            if (!optionBelongsTo(optionId, q)) {
                throw new IllegalArgumentException("Ungültige Option für Frage: " + q.getText());
            }
            response.getAnswers().add(Answer.builder()
                .surveyResponse(response).question(q).optionId(optionId).build());
        }
    }

    private boolean optionBelongsTo(Long optionId, Question q) {
        return q.getOptions().stream().anyMatch(o -> o.getId().equals(optionId));
    }

    private QuestionResult buildQuestionResult(Question q, List<SurveyResponse> responses, boolean includeFreeText) {
        List<Answer> answers = responses.stream()
            .flatMap(r -> r.getAnswers().stream())
            .filter(a -> a.getQuestion() != null && a.getQuestion().getId().equals(q.getId()))
            .toList();

        QuestionResult.QuestionResultBuilder builder = QuestionResult.builder()
            .questionId(q.getId())
            .text(q.getText())
            .type(q.getType())
            .orderIndex(q.getOrderIndex())
            .required(q.getRequired());

        switch (q.getType()) {
            case RATING -> {
                List<Integer> ratings = answers.stream()
                    .map(a -> parseRating(a.getValue()))
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .toList();
                builder.answerCount(ratings.size());
                if (!ratings.isEmpty()) {
                    double mean = ratings.stream().mapToInt(Integer::intValue).average().orElse(0);
                    builder.mean(Math.round(mean * 100.0) / 100.0);
                }
                List<Integer> distribution = new ArrayList<>(List.of(0, 0, 0, 0, 0));
                for (Integer r : ratings) {
                    distribution.set(r - 1, distribution.get(r - 1) + 1);
                }
                builder.ratingDistribution(distribution);
            }
            case SINGLE, MULTI -> {
                Map<Long, Long> counts = new LinkedHashMap<>();
                for (QuestionOption o : q.getOptions()) {
                    counts.put(o.getId(), 0L);
                }
                for (Answer a : answers) {
                    if (a.getOptionId() != null) {
                        counts.merge(a.getOptionId(), 1L, Long::sum);
                    }
                }
                List<OptionCount> optionCounts = q.getOptions().stream()
                    .map(o -> OptionCount.builder()
                        .optionId(o.getId())
                        .optionText(o.getText())
                        .count(counts.getOrDefault(o.getId(), 0L))
                        .build())
                    .toList();
                builder.answerCount(answers.size());
                builder.counts(optionCounts);
            }
            case TEXTFIELD, TEXTAREA -> {
                List<String> texts = answers.stream()
                    .map(Answer::getValue)
                    .filter(v -> v != null && !v.isBlank())
                    .toList();
                builder.answerCount(texts.size());
                builder.freeTexts(includeFreeText ? texts : null);
            }
        }
        return builder.build();
    }

    private Optional<Integer> parseRating(String value) {
        try {
            return Optional.of(Integer.parseInt(value));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private SurveyResponseDetailDto toResponseDetail(SurveyResponse response) {
        Map<Long, Question> questionById = response.getSurvey() == null ? Map.of()
            : response.getSurvey().getQuestions().stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));
        List<AnswerDetailDto> answers = response.getAnswers().stream()
            .map(a -> toAnswerDetail(a, questionById.get(a.getQuestion() == null ? null : a.getQuestion().getId())))
            .toList();
        return SurveyResponseDetailDto.builder()
            .submittedAt(response.getSubmittedAt())
            .answers(answers)
            .build();
    }

    private AnswerDetailDto toAnswerDetail(Answer a, Question q) {
        String questionText = q == null ? "?" : q.getText();
        String answerText;
        if (q == null) {
            answerText = a.getValue() == null ? "" : a.getValue();
        } else {
            switch (q.getType()) {
                case RATING -> answerText = (a.getValue() == null ? "" : a.getValue()) + "/5";
                case SINGLE -> answerText = optionText(q, a.getOptionId());
                case MULTI -> answerText = optionText(q, a.getOptionId());
                default -> answerText = a.getValue() == null ? "" : a.getValue();
            }
        }
        return AnswerDetailDto.builder()
            .questionId(a.getQuestion() == null ? null : a.getQuestion().getId())
            .questionText(questionText)
            .answerText(answerText)
            .build();
    }

    private String optionText(Question q, Long optionId) {
        if (optionId == null) return "";
        return q.getOptions().stream()
            .filter(o -> o.getId().equals(optionId))
            .map(QuestionOption::getText)
            .findFirst()
            .orElse("");
    }

    private SurveyAdminDto toAdminDto(Survey survey, long responseCount) {
        return SurveyAdminDto.builder()
            .id(survey.getId())
            .title(survey.getTitle())
            .description(survey.getDescription())
            .status(survey.getStatus())
            .createdAt(survey.getCreatedAt())
            .updatedAt(survey.getUpdatedAt())
            .responseCount(responseCount)
            .questions(survey.getQuestions().stream()
                .map(q -> SurveyQuestionAdminDto.builder()
                    .id(q.getId())
                    .type(q.getType())
                    .text(q.getText())
                    .orderIndex(q.getOrderIndex())
                    .required(q.getRequired())
                    .maxLength(q.getMaxLength())
                    .options(q.getOptions().stream()
                        .map(o -> QuestionOptionDto.builder()
                            .id(o.getId())
                            .text(o.getText())
                            .orderIndex(o.getOrderIndex())
                            .build())
                        .toList())
                    .build())
                .toList())
            .build();
    }

    private Survey requireSurvey(Long id) {
        return surveyRepository.findByIdWithQuestions(id)
            .orElseThrow(() -> new IllegalArgumentException("Umfrage nicht gefunden"));
    }
}
