package de.ffl.repository;

import de.ffl.domain.VisitLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface VisitLogRepository extends JpaRepository<VisitLog, Long> {

    @Modifying
    @Query(value = "INSERT INTO ffl_visit_log (user_id, visit_date) VALUES (:userId, :visitDate) ON CONFLICT DO NOTHING", nativeQuery = true)
    int insertVisitIfAbsent(@Param("userId") Long userId, @Param("visitDate") LocalDate visitDate);

    @Query("SELECT YEAR(v.visitDate) as year, MONTH(v.visitDate) as month, v.user.login as login, " +
           "v.user.firstName as firstName, v.user.lastName as lastName, COUNT(v) as cnt " +
           "FROM VisitLog v " +
           "WHERE v.visitDate >= :from AND v.visitDate < :to " +
           "GROUP BY YEAR(v.visitDate), MONTH(v.visitDate), v.user.login, v.user.firstName, v.user.lastName " +
           "ORDER BY YEAR(v.visitDate), MONTH(v.visitDate), v.user.login")
    List<Object[]> countVisitsByUserAndMonth(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
