package de.ffl.repository;

import de.ffl.domain.LoginLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LoginLogRepository extends JpaRepository<LoginLog, Long> {

    @Query("SELECT YEAR(l.loginAt) as year, MONTH(l.loginAt) as month, COUNT(l) as cnt " +
           "FROM LoginLog l " +
           "WHERE l.loginAt >= :from AND l.loginAt < :to " +
           "GROUP BY YEAR(l.loginAt), MONTH(l.loginAt) " +
           "ORDER BY YEAR(l.loginAt), MONTH(l.loginAt)")
    List<Object[]> countLoginsByMonth(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT YEAR(l.loginAt) as year, MONTH(l.loginAt) as month, l.user.login as login, COUNT(l) as cnt " +
           "FROM LoginLog l " +
           "WHERE l.loginAt >= :from AND l.loginAt < :to " +
           "GROUP BY YEAR(l.loginAt), MONTH(l.loginAt), l.user.login " +
           "ORDER BY YEAR(l.loginAt), MONTH(l.loginAt), l.user.login")
    List<Object[]> countLoginsByUserAndMonth(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
