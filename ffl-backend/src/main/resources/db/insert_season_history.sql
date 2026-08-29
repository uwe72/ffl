-- Initiale Saisons für die Historie (einmalig ausführen)
-- Die Tabelle ffl_season_history wird automatisch von JPA (ddl-auto: update) angelegt.
INSERT INTO ffl_season_history (saison, budget, anzahl_manager)
SELECT d.saison, d.budget, d.anzahl_manager
FROM (VALUES
    ('2011-2012', 28,   115),
    ('2012-2013', 29,   184),
    ('2013-2014', 29.5, 223),
    ('2014-2015', 30,   206),
    ('2015-2016', 30,   219),
    ('2016-2017', 30,   180),
    ('2017-2018', 30,   177),
    ('2018-2019', 30,   158),
    ('2019-2020', 30,   183),
    ('2020-2021', 30,   201),
    ('2021-2022', 30,   222),
    ('2022-2023', 30,   229),
    ('2023-2024', 30,   254),
    ('2024-2025', 30,   238),
    ('2025-2026', 30,   247)
) AS d(saison, budget, anzahl_manager)
WHERE NOT EXISTS (SELECT 1 FROM ffl_season_history);
