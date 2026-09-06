package de.ffl.repository;

import de.ffl.domain.DownloadLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DownloadLogRepository extends JpaRepository<DownloadLog, Long> {

    @Query("SELECT YEAR(l.accessedAt) as year, MONTH(l.accessedAt) as month, u.login as login, " +
           "u.firstName as firstName, u.lastName as lastName, COUNT(l) as cnt " +
           "FROM DownloadLog l LEFT JOIN l.user u " +
           "WHERE l.accessedAt >= :from AND l.accessedAt < :to " +
           "GROUP BY YEAR(l.accessedAt), MONTH(l.accessedAt), u.login, u.firstName, u.lastName " +
           "ORDER BY YEAR(l.accessedAt), MONTH(l.accessedAt), u.login")
    List<Object[]> countDownloadsByUserAndMonth(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT YEAR(l.accessedAt) as year, MONTH(l.accessedAt) as month, l.documentName as documentName, " +
           "COUNT(l) as cnt " +
           "FROM DownloadLog l " +
           "WHERE l.accessedAt >= :from AND l.accessedAt < :to " +
           "GROUP BY YEAR(l.accessedAt), MONTH(l.accessedAt), l.documentName " +
           "ORDER BY YEAR(l.accessedAt), MONTH(l.accessedAt), l.documentName")
    List<Object[]> countDownloadsByDocumentAndMonth(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
