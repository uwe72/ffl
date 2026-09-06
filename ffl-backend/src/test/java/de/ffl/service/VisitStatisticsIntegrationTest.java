package de.ffl.service;

import de.ffl.domain.User;
import de.ffl.domain.UserRole;
import de.ffl.dto.VisitStatMonthDto;
import de.ffl.dto.VisitStatisticDto;
import de.ffl.repository.UserRepository;
import de.ffl.repository.VisitLogRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class VisitStatisticsIntegrationTest {

    @Autowired
    private VisitStatisticsService visitStatisticsService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private VisitLogRepository visitLogRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate txTemplate;
    private User user;

    @BeforeAll
    void setUp() {
        txTemplate = new TransactionTemplate(transactionManager);
        user = txTemplate.execute(status -> userRepository.save(User.builder()
            .login("visittest")
            .password("x")
            .email("visittest@example.com")
            .role(UserRole.NORMAL)
            .build()));
    }

    @AfterAll
    void tearDown() {
        txTemplate.executeWithoutResult(status -> {
            visitLogRepository.deleteAll();
            if (user != null) {
                userRepository.findById(user.getId()).ifPresent(userRepository::delete);
            }
        });
    }

    @Test
    void recordVisit_sameDayTwice_persistsOnceAndAggregationWorks() {
        visitStatisticsService.recordVisit(user);
        visitStatisticsService.recordVisit(user);

        assertThat(visitLogRepository.count()).isEqualTo(1);
        assertThat(userRepository.findById(user.getId()).orElseThrow().getVisitCount()).isEqualTo(1);

        VisitStatisticDto stats = visitStatisticsService.getStatistics(
            LocalDate.now().withDayOfMonth(1), LocalDate.now().plusDays(1));
        YearMonth current = YearMonth.now();
        VisitStatMonthDto thisMonth = stats.getMonths().stream()
            .filter(m -> m.getYear() == current.getYear() && m.getMonth() == current.getMonthValue())
            .findFirst().orElseThrow();
        assertThat(thisMonth.getTotalVisits()).isEqualTo(1);
        assertThat(thisMonth.getUsers().get(0).getLogin()).isEqualTo("visittest");
    }
}
