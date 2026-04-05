/**
 * Endspiel-Situation: Katalog + Erkennung aus chess.js-Stellung.
 * Erweiterbar: neue Einträge in ENDGAME_CATALOG, match(p) nutzt getPieceCountsFromGame.
 *
 * goals[] = nummerierter Plan (Schritt 1–n), goalOne = Kernaussage in der Karten-Zusammenfassung.
 */
(function (global) {
  'use strict';

  function noOther(p) {
    return (
      p.wQ === 0 &&
      p.bQ === 0 &&
      p.wR === 0 &&
      p.bR === 0 &&
      p.wB === 0 &&
      p.bB === 0 &&
      p.wN === 0 &&
      p.bN === 0
    );
  }

  /** Keine Bauern, keine Dame/Läufer/Springer — Turmendspiele */
  function noPawnNoQueenBishopKnight(p) {
    return (
      p.wP === 0 &&
      p.bP === 0 &&
      p.wQ === 0 &&
      p.bQ === 0 &&
      p.wB === 0 &&
      p.bB === 0 &&
      p.wN === 0 &&
      p.bN === 0
    );
  }

  /**
   * Grobe Linien-Spiegelung: sortierte weiße Linien + absteigend sortierte schwarze Linien
   * ergeben paarweise Summe 7 (a↔h). Gleiche Mittellinie (z. B. e+e) zählt nicht als Spiegel.
   */
  function isFileMirrorPawnStructure(p) {
    if (p.wP !== p.bP || p.wP < 1) return false;
    var wf = p.wPfiles.slice().sort(function (a, b) {
      return a - b;
    });
    var bf = p.bPfiles.slice().sort(function (a, b) {
      return b - a;
    });
    for (var i = 0; i < wf.length; i++) {
      if (wf[i] + bf[i] !== 7) return false;
    }
    return true;
  }

  function fileStackStats(files) {
    var tally = {};
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      tally[f] = (tally[f] || 0) + 1;
    }
    var maxStack = 0;
    var unique = 0;
    for (var k in tally) {
      unique++;
      if (tally[k] > maxStack) maxStack = tally[k];
    }
    return { maxStack: maxStack, uniqueFiles: unique };
  }

  function getPieceCountsFromGame(chessGame) {
    if (!chessGame) return null;
    var b = chessGame.board();
    var p = {
      wP: 0,
      bP: 0,
      wK: 0,
      bK: 0,
      wQ: 0,
      bQ: 0,
      wR: 0,
      bR: 0,
      wB: 0,
      bB: 0,
      wN: 0,
      bN: 0,
      wPfiles: [],
      bPfiles: [],
    };
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var sq = b[r][c];
        if (!sq) continue;
        var k = (sq.color === 'w' ? 'w' : 'b') + sq.type.toUpperCase();
        p[k]++;
        if (sq.type === 'p') {
          if (sq.color === 'w') p.wPfiles.push(c);
          else p.bPfiles.push(c);
        }
      }
    }
    var ws = fileStackStats(p.wPfiles);
    var bs = fileStackStats(p.bPfiles);
    p.wPmaxOnFile = ws.maxStack;
    p.wPuniqueFiles = ws.uniqueFiles;
    p.bPmaxOnFile = bs.maxStack;
    p.bPuniqueFiles = bs.uniqueFiles;
    return p;
  }

  var ENDGAME_CATALOG = [
    {
      id: 'kp_vs_k_rook',
      priority: 100,
      match: function (p) {
        return (
          p.wP === 1 &&
          p.bP === 0 &&
          noOther(p) &&
          (p.wPfiles[0] === 0 || p.wPfiles[0] === 7)
        );
      },
      title: 'König + Randbauer vs König',
      goals: [
        'Zuerst: Weißen König auf das Schlüsselfeld vor dem Randbauern (b7 bei a-Bauer, analog bei h-Bauer).',
        'Schwarzen König von der Ecke a8/b8 fernhalten — sonst bleibt der Randbauer stecken.',
        'Erst wenn das Schlüsselfeld sicher ist: Bauern vorsichtig vorziehen; nie in sofortiges Patt laufen.',
        'Dauernd prüfen: hat der schwarze König noch Luft, oder droht Remis durch Patt?',
      ],
      goalOne: 'König auf das Schlüsselfeld vor den Randbauern bringen (b7/a7).',
      warnings: [
        '⚠️ Randbauer (a/h) gewinnt NUR wenn König b7/a7 besetzt',
        '⚠️ b7+ wenn schwarzer König auf a8 = sofortiges PATT → Remis!',
        '⚠️ Schwarzer König auf a8 + Weißer König auf a6 = immer Remis',
      ],
      tip: '💡 Randbauern führen oft zu Patt. Der schwarze König versteckt sich in der Ecke — du kannst ihn nicht herausschlagen.',
    },
    {
      id: 'kp_vs_k',
      priority: 90,
      match: function (p) {
        return p.wP === 1 && p.bP === 0 && noOther(p);
      },
      title: 'König + Bauer vs König',
      goals: [
        'König vor den Bauern auf die 6. Reihe bringen (z. B. e-Bauer: König in die Zone vor e6).',
        'Opposition gewinnen: Könige gegenüber, ein Feld dazwischen, Gegner soll ziehen müssen.',
        'Schlüsselfelder halten — die Felder zwei Schritte vor dem Bauern dominieren.',
        'Erst danach den Bauern Schritt für Schritt vorwärts bis zur Umwandlung.',
      ],
      goalOne: 'König vor den Bauern auf die 6. Reihe bringen und Opposition halten.',
      warnings: [
        '⚠️ Bauer zu früh vorschieben ohne König davor = Remis!',
        '⚠️ König hinter dem Bauern verliert die Opposition',
        '⚠️ Bauer auf 7. Reihe ohne König davor kann Patt sein',
      ],
      tip: '💡 König MUSS auf die 6. Reihe vor den Bauern. Dann ist Sieg garantiert — egal was Schwarz macht.',
    },
    {
      id: 'kpp_vs_k',
      priority: 85,
      match: function (p) {
        return p.wP === 2 && p.bP === 0 && noOther(p);
      },
      title: 'König + 2 Bauern vs König',
      goals: [
        'Schwarzen König mit dem weißen König von deinen Bauern wegziehen oder binden.',
        'Verbundene Bauern im Gleichschritt vorschieben — sie decken sich gegenseitig.',
        'Priorität: einen Außenfreibauern vorbereiten (zieht den schwarzen König maximal weg).',
        'Wenn nötig: einen Bauern opfern, damit der andere durchbricht oder Freibauer wird.',
      ],
      warnings: [
        '⚠️ Bauern nie einzeln ohne Königsunterstützung vorrücken',
        '⚠️ Zwei Randbauern (a+h) gegen König können Remis sein',
        '⚠️ Pattfallen: niemals den schwarzen König einmauern ohne Fluchtweg',
      ],
      tip: '💡 Zwei verbundene Bauern auf der 6. Reihe gewinnen immer — sie können nicht beide gestoppt werden.',
    },
    {
      id: 'kppp_vs_kp_more',
      priority: 80,
      match: function (p) {
        return p.wP >= 2 && p.bP >= 1 && noOther(p) && p.wP > p.bP;
      },
      title: 'Bauernmehrheit — Freibauern schaffen',
      goals: [
        'Auf dem Flügel mit Mehrheit einen echten Außen- oder Mittelfreibauern erzeugen.',
        'Diesen Freibauern laufen lassen — der schwarze König muss sich dorthin begeben.',
        'Weißen König auf die andere Seite führen und dort einbrechen, während Schwarz gebunden ist.',
        'Mehrheit schrittweise in Umwandlung oder gewonnenes Unterendspiel überführen.',
      ],
      warnings: [
        '⚠️ Falschen Freibauern schaffen — Außenfreibauer ist stärker als Mittelfreibauer',
        '⚠️ Passiver König verliert auch mit Mehrbauer',
        '⚠️ Zugzwang berechnen — manchmal ist Warten stärker als Vorrücken',
      ],
      tip: '💡 Außenfreibauer = Ablenkung. Er zwingt schwarzen König an den Rand, dann bricht weißer König auf der anderen Seite ein.',
    },
    {
      id: 'k_all_wpawns_one_file',
      priority: 86,
      match: function (p) {
        return (
          noOther(p) &&
          p.bP === 0 &&
          p.wP >= 2 &&
          p.wPuniqueFiles === 1
        );
      },
      title: 'Alle weißen Bauern auf einer Linie',
      goals: [
        'Weißen König aktiv zur „Bauernsäule“ führen — ohne König bleibt die Kette stecken.',
        'Die vorderste (höchste) Spitze mit dem König absichern, dann den untersten Bauer eine Reihe schieben.',
        'Schwarzen König von der Linie blockieren oder ablenken — sonst Sperre und Zugzwang.',
        'Doppelbauern mitdenken: oft braucht es ein Opfer, um einen echten Freibauern zu bekommen.',
      ],
      goalOne: 'König aktivieren und die Bauernkette von der Spitze her freispielen.',
      warnings: [
        '⚠️ Zu früh nach vorne schieben ohne König = festsitzen',
        '⚠️ Mehrere Bauern auf einer Linie = keine echten Freibauern bis du opferst',
        '⚠️ Randlinie (a/h) mit Säule — oft enger und pattgefährlicher',
      ],
      tip: '💡 Eine „Turmstellung“ auf einer Linie braucht Königsführung: erst der König räumt den Weg, dann darf der untere Bauer nach.',
    },
    {
      id: 'k4p_vs_k',
      priority: 84,
      match: function (p) {
        return noOther(p) && p.bP === 0 && p.wP >= 4;
      },
      title: 'König + 4+ Bauern vs König',
      goals: [
        'Inventur: Wo entsteht zuerst ein Freibauer? Nicht alle Bauern blind vorschieben.',
        'König zentralisieren oder auf den Flügel mit dem stärksten Durchbruch lenken.',
        'Außenbauer als Ablenkung nutzen — schwarzer König soll an den Rand gebunden werden.',
        'Wenn Bauern blockieren: mit König Zugzwang erzeugen oder gezielt opfern für einen klaren Freibauern.',
      ],
      goalOne: 'Freibauern schaffen und den schwarzen König mit dem weißen König binden.',
      warnings: [
        '⚠️ Zu viele blockierte Bauern — dann reicht Mehrzahl nicht ohne König',
        '⚠️ Falsches Opfer: einen Bauern opfern ohne neuen Freibauern',
        '⚠️ Patt wenn der schwarze König eingesperrt wird ohne Matt',
      ],
      tip: '💡 Viele Bauern gewinnen durch Tempo und Freibauern — nicht durch wildes Vorrücken aller Bauern auf einmal.',
    },
    {
      id: 'kppp_vs_k',
      priority: 84,
      match: function (p) {
        return noOther(p) && p.bP === 0 && p.wP === 3;
      },
      title: 'König + 3 Bauern vs König',
      goals: [
        'Den stärksten Freibauer-Pfad markieren — meist beginnt es mit dem Außenbauer.',
        'Zwei Bauern als Kette oder Fessel halten, den dritten zum Durchbruch führen.',
        'König zwischen den kritischen Flügeln pendeln, je nachdem wo Schwarz pariert.',
        'Schwarzen König von der Umwandlungslinie deines Freibauern fernhalten.',
      ],
      goalOne: 'Einen klaren Freibauern schaffen und mit dem König unterstützen.',
      warnings: [
        '⚠️ Drei blockierte Bauern auf einer Linie sind schwächer als verteilt',
        '⚠️ Zu früh opfern — manchmal gewinnt erst Zugzwang auf dem ganzen Brett',
        '⚠️ Randbauer in der Kette — Remis- und Pattideen wie beim Einzelrandbauern',
      ],
      tip: '💡 Drei Bauern sind meist gewonnen, wenn der weiße König aktiv ist und mindestens ein Freibauer entsteht.',
    },
    {
      id: 'kpp_vs_kp',
      priority: 79,
      match: function (p) {
        return noOther(p) && p.wP === 2 && p.bP === 1;
      },
      title: '2 weiße Bauern vs 1 schwarzer Bauer',
      goals: [
        'Durchrechnen: welcher weiße Bauer kann Freibauer werden — und was blockiert ihn?',
        'Schwarzen König auf die defensive Seite lenken, damit deine Mehrheit zählt.',
        'Den schwarzen Bauern sperren oder gewinnen, während der zweite weiße durchläuft.',
        'Wenn nur noch ein weißer übrig ist: Opposition und Schlüsselfelder wie K+B vs K anwenden.',
      ],
      goalOne: 'Aus der Mehrheit einen durchgehenden Freibauern machen.',
      warnings: [
        '⚠️ Beide weißen Bauern blockieren — dann reicht Mehrzahl nicht',
        '⚠️ Schwarzer Freibauer auf der anderen Seite kann dich schlagen im Rennen',
        '⚠️ Zu spät den König aktivieren',
      ],
      tip: '💡 Oft gewinnt ein Außenfreibauer, während der zweite Bauer oder der König den schwarzen König bindet.',
    },
    {
      id: 'kp_vs_kpp',
      priority: 78,
      match: function (p) {
        return noOther(p) && p.wP === 1 && p.bP === 2;
      },
      title: '1 weißer Bauer vs 2 schwarze Bauern',
      goals: [
        'Bewerten: Ist dein Bauer Freibauer oder weiter als die schwarze Kette?',
        'König maximal aktiv in die schwarze Struktur — schwache Felder und Blockaden suchen.',
        'Schwarze Bauern gegeneinander spielen: blockieren, Linien verstopfen, Tempo gewinnen.',
        'Renntempo und Remis-Ideen (z. B. gleichzeitige Damen) konkret durchzählen.',
      ],
      goalOne: 'Mit König und einem starken Bauern Gegenwehr organisieren — oft kämpfen auf Remis.',
      warnings: [
        '⚠️ Unterzahl ist objektiv meist schlechter — keine Kunstgriffe erzwingen',
        '⚠️ Schwarze Doppelbauern können deinen einen Bauern festnageln',
        '⚠️ Zwei verbundene schwarze Bauern sind sehr solide',
      ],
      tip: '💡 Hier zählen oft genaues Temporechnen und ob dein Bauer „schneller“ ist als die schwarze Struktur.',
    },
    {
      id: 'kp_vs_kppp',
      priority: 77,
      match: function (p) {
        return noOther(p) && p.wP === 1 && p.bP === 3;
      },
      title: '1 weißer Bauer vs 3 schwarze Bauern',
      goals: [
        'Zuerst Quadratregel / Rennen: kann der eine Bauer allein noch gewinnen?',
        'König tief in die schwarze Bauernformation — Zugzwang, Blockade, Königslenkung.',
        'Wenn Gewinn unrealistisch: ewige Blockade oder Remis durch Rennen/Timing anstreben.',
        'Kein voreiliges Opfer — oft entscheidet ein einziges Tempo.',
      ],
      goalOne: 'Realistisch bewerten: Freibauer-Quadrat und Königsnähe entscheiden.',
      warnings: [
        '⚠️ Drei Bauern können schnell einen Freibauern gegen dich erzeugen',
        '⚠️ Ohne starken eigenen Freibauer ist Verlust wahrscheinlich',
        '⚠️ Zu passiv = schwarze Bauern laufen durch',
      ],
      tip: '💡 Unterzahl gegen drei Bauern: oft nur retten, wenn dein Bauer weit ist oder der schwarze König schlecht steht.',
    },
    {
      id: 'kpp_vs_kppp',
      priority: 76,
      match: function (p) {
        return noOther(p) && p.wP === 2 && p.bP === 3;
      },
      title: '2 weiße vs 3 schwarze Bauern',
      goals: [
        'Pro Flügel prüfen: wo ist der realistischste weiße Durchbruch / Freibauer?',
        'Schwarze Bauern verklemmen oder verlangsamen, damit nicht alle durchlaufen.',
        'König dorthin lenken, wo der erste weiße Freibauer entstehen kann.',
        'Tauschfolgen bis zu einem überschaubaren Endspiel (z. B. 1 vs 1 oder Remis) durchrechnen.',
      ],
      goalOne: 'Die schwächste schwarze Struktur angreifen und Mehrheit kompensieren.',
      warnings: [
        '⚠️ Ein schwarzer Freibauer auf dem anderen Flügel kann alles entscheiden',
        '⚠️ Zu viele Tausche ohne Plan verschlechtern oft die weiße Stellung',
        '⚠️ Passiver weißer König = schwarze Mehrheit durchmarschiert',
      ],
      tip: '💡 Gegen Mehrbauer zählt konkrete Berechnung: welcher Bauer wird zuerst Dame?',
    },
    {
      id: 'white_pawn_minority',
      priority: 66,
      match: function (p) {
        if (!noOther(p) || p.wP < 1 || p.bP < 1 || p.bP <= p.wP) return false;
        if (p.wP === 1 && (p.bP === 2 || p.bP === 3)) return false;
        if (p.wP === 2 && p.bP === 3) return false;
        return true;
      },
      title: 'Weniger weiße als schwarze Bauern',
      goals: [
        'Alle eigenen Freibauern und weit vorgerückten Bauern finden — das sind deine Chancen.',
        'Schwarzen König mit dem weißen König an einer Seite festbinden, Bauern bremsen.',
        'Gegnerische Doppelbauern und verstopfte Linien gezielt ausnutzen.',
        'Konkrete Rettungsidee festhalten: Blockade, Rennen, Schach bei der Umwandlung.',
      ],
      goalOne: 'Mit aktivem König und konkreten Drohungen gegen die Mehrheit ankämpfen.',
      warnings: [
        '⚠️ Materialnachteil ohne Freibauer ist meist kritisch',
        '⚠️ Zu passiv = schwarze Bauern laufen alle durch',
        '⚠️ Nicht jedes Unterendspiel ist rettbar — Züge genau zählen',
      ],
      tip: '💡 Unterzahl heißt nicht automatisch verloren: ein schneller Freibauer oder ein schlecht koordinierter schwarzer König ändern das Bild.',
    },
    {
      id: 'kp_vs_kp_mirror_files',
      priority: 75,
      match: function (p) {
        return (
          p.wP >= 1 &&
          p.bP >= 1 &&
          noOther(p) &&
          p.wP === p.bP &&
          isFileMirrorPawnStructure(p)
        );
      },
      title: 'Bauern annähernd spiegelbildlich (Linien a↔h)',
      goals: [
        'König zentralisieren — in solchen Stellungen zählt Aktivität zuerst.',
        'Opposition oder Fernopposition anstreben, um als Erster einzubrechen.',
        'Durchbruch berechnen: gezielte Bauernopfer, um einen Freibauern zu schaffen.',
        'Ungerade Königsabstände und Zugzwang auf dem ganzen Brett mitdenken.',
      ],
      goalOne: 'Opposition gewinnen und als Erster mit dem König einbrechen.',
      warnings: [
        '⚠️ Bauernschwächungen ohne Gegenleistung vermeiden',
        '⚠️ Zugzwang-Fallen (Minenfelder) vor dem Einmarsch berechnen',
        '⚠️ Nur Linien-Spiegelung — Reihen und genaue Stellung können das Bild ändern',
      ],
      tip: '💡 Wenn die Bauern auf gespiegelten Linien stehen, ähnelt die Planspiele oft einem symmetrischen Kampf — Tempo und König aktiv entscheiden.',
    },
    {
      id: 'kr_vs_k',
      priority: 98,
      match: function (p) {
        return (
          p.wK === 1 &&
          p.bK === 1 &&
          p.wR === 1 &&
          p.bR === 0 &&
          noPawnNoQueenBishopKnight(p)
        );
      },
      title: 'König + Turm vs König',
      goals: [
        'Schwarzen König mit Turm und König zum Rand oder in die Ecke drängen („Lucena-ähnliche“ Idee: König voran).',
        'Turm so stellen, dass er Linien schneidet und den schwarzen König begrenzt — nicht zu weit vom Gegner weg.',
        'Wenn der schwarze König nah ist: Turm auf Sperr- oder Schachdistanz, eigenen König näher an den gegnerischen König führen.',
        'Mattbild am Rand üben: Turm und König kooperieren, ohne Patt zu erzeugen.',
      ],
      goalOne: 'König aktivieren, dann mit Turm den schwarzen König einschnüren.',
      warnings: [
        '⚠️ PATT: Turm stellt zu eng, schwarzer König ohne Zug = Remis',
        '⚠️ Turm zu weit weg — der schwarze König entwischt zur Mitte',
        '⚠️ Stalemate durch 50-Züge-Regel wenn kein Fortschritt',
      ],
      tip: '💡 Klassisch: zuerst den eigenen König in die „richtige Zone“ bringen, dann mit dem Turm Matt erzwingen — wie die Grundzüge aus dem Lehrbuch.',
      extraTips: [
        'Schritt für Schritt die „Box“ verkleinern — der schwarze König soll weniger Felder behalten.',
        'Turm nicht zu weit weg: er soll Linien schneiden, nicht nur von der Ferne zuschauen.',
        'Mattbild üben: immer eine Flucht für Schwarz lassen, bis das echte Matt kommt.',
        'Eigenen König näher an den schwarzen König führen, dann greift der Turm effektiver.',
        'Turm von der Seite oder mit Abstand stellen — zu eng = Pattgefahr.',
      ],
    },
    {
      id: 'kr_vs_kr',
      priority: 94,
      match: function (p) {
        return (
          p.wK === 1 &&
          p.bK === 1 &&
          p.wR === 1 &&
          p.bR === 1 &&
          noPawnNoQueenBishopKnight(p)
        );
      },
      title: 'Turm vs Turm — Königsspiel',
      goals: [
        'Eigenen König aktivieren und zentralisieren — oft entscheidet der König den Kampf.',
        'Turm auf offene Linien oder hinter gegnerischen Figuren (7. Reihe-Idee): Aktivität vor Material.',
        'Gegnerischen Turm binden oder zu passiven Zügen zwingen; doppelte Angriffe mit König + Turm suchen.',
        'Remis mit Turm weniger beachten als mit Läufer/Springer — oft gewinnt bessere Königstellung oder Aktivität.',
      ],
      goalOne: 'König und Turm koordinieren: Aktivität und Linien beherrschen.',
      warnings: [
        '⚠️ Turm tauschen ohne Plan — aus Gewinn wird schnell remis',
        '⚠️ Passiver Turm am Rand während der gegnerische Turm eindringt',
        '⚠️ König zu weit weg vom Geschehen — der Turm allein reicht selten',
      ],
      tip: '💡 Turmendspiele leben von Schnittfeldern und Königsangriff: wer zuerst den gegnerischen König bedrängt, hat oft die praktische Initiative.',
    },
    {
      id: 'krp_vs_krp',
      priority: 96,
      match: function (p) {
        return (
          p.wK === 1 &&
          p.bK === 1 &&
          p.wR === 1 &&
          p.bR === 1 &&
          p.wP >= 1 &&
          p.bP >= 1 &&
          p.wP === p.bP &&
          p.wQ === 0 &&
          p.bQ === 0 &&
          p.wB === 0 &&
          p.bB === 0 &&
          p.wN === 0 &&
          p.bN === 0
        );
      },
      title: 'Turm + Bauern vs Turm + Bauern',
      goals: [
        'Freibauer erkennen: wer zuerst durchbricht, zwingt oft den gegnerischen Turm oder König.',
        'Turm hinter dem Freibauer (klassisch) oder vom Rand aus die gegnerische Seite schneiden.',
        'Lucena- und Philidor-Ideen im Kopf: Wettlauf, Brücke, Turm von der Seite gegen den König.',
        'Gegnerischen Turm aktiv halten oder binden — passiver Turm + aktiver Freibauer entscheidet oft.',
      ],
      goalOne: 'Freibauer und Turm koordinieren — Aktivität vor dem gegnerischen Turm.',
      warnings: [
        '⚠️ Turm zu früh tauschen — aus Gewinn wird schnell technisches Remis',
        '⚠️ König zu weit weg vom Bauernlauf — der Turm allein stoppt selten alles',
        '⚠️ Falschen Flügel wählen — manchmal gewinnt nur der zweite Freibauer',
      ],
      tip: '💡 Turm + Bauern: der Freibauer ist meist der Star — der Turm liefert Schachs, sperrt Linien oder steht hinter dem Bauern.',
      /** Zufälliger Zusatz in der UI (siehe updateSituation im HTML) */
      extraTips: [
        'Turm auf die 7./6. Reihe: oft maximal unbequem für den gegnerischen König.',
        'Wettlauf auf zwei Flügeln: manchmal ist der zweite Freibauer wichtiger als der erste.',
        'Gegnerischen Turm „frisieren“: weg vom kritischen Bauernpfad, bevor du den König schickst.',
        'Philidor-Idee: Turm vom Seitenfel aus den gegnerischen König vom Bauern fernhalten.',
        'Lucena-Idee: eigener König als Blockade vor dem gegnerischen König, Turm baut die „Brücke“.',
        'Zugzwang mit Turm: ein Tempo reicht, um den Freibauer einen Schritt weiterzuschieben.',
        'Gleiche Bauernzahl: kleine strukturelle Pluspunkte (aktiver König, besserer Turm) entscheiden.',
        'Randbauer mit Turm: oft andere Technik als Mittelbauer — trotzdem erst Aktivität schaffen.',
        'Tausch nur mit Plan: Turm gegen Turm kann aus Gewinn sofort Remis bedeuten.',
        'König in die „Quadrate“ des Bauernlaufs einbeziehen — ohne König läuft selten etwas.',
      ],
    },
    {
      id: 'rook_endgame_general',
      priority: 9,
      match: function (p) {
        return (
          noPawnNoQueenBishopKnight(p) &&
          p.wK === 1 &&
          p.bK === 1 &&
          (p.wR > 0 || p.bR > 0)
        );
      },
      title: 'Turmendspiel — Grundprinzipien',
      goals: [
        'Turm auf aktive Felder: offene Linien, 7./8. Reihe, Schneiden des gegnerischen Königs.',
        'König mit einbeziehen — im Endspiel ist er stark für Zugzwang und Mattnetze.',
        'Turm nicht unnötig weit von der Aktion entfernen; Tausch nur mit klarem Plan.',
        'Auf ewige Schachs und Remis-Ideen achten, wenn du Vorteil hast.',
      ],
      goalOne: 'Turm aktiv, König mitspielen lassen.',
      warnings: [
        '⚠️ Passiver Turm verliert oft gegen aktiven Turm + König',
        '⚠️ Patt und Dauerschach als Rettung des Schwächeren',
        '⚠️ Zu vorsichtig = Vorteil verschenken',
      ],
      tip: '💡 Turm braucht offene Linien — oft ist ein Zug mit dem König stärker als ein passiver Turmrückzug.',
    },
    {
      id: 'qq_vs_k',
      priority: 96,
      match: function (p) {
        return (
          p.wQ >= 2 &&
          p.wP === 0 &&
          p.wR === 0 &&
          p.wB === 0 &&
          p.wN === 0 &&
          p.bQ === 0 &&
          p.bR === 0 &&
          p.bB === 0 &&
          p.bN === 0 &&
          p.bP === 0
        );
      },
      title: 'Zwei Damen vs König',
      goals: [
        'Schwarzen König mit den Damen zum Rand oder in die Ecke drängen.',
        'Eine Dame begrenzt das Feld („Netz“), die zweite liefert Schach oder stellt ein.',
        'Patt vermeiden: Abstand halten, bis Matt wirklich droht.',
        'Bei Bedarf den weißen König einbeziehen — er hilft beim Einengen und gegen Patt.',
      ],
      warnings: [
        '⚠️ Zu früh zugeben — mit zwei Damen ist Matt immer möglich, aber Patt vermeiden wenn der König zu weit weg ist',
        '⚠️ Dame nicht so stellen dass der schwarze König patt steht bevor Matt droht',
        '⚠️ Zeit nicht verschwenden — systematisch einengen',
      ],
      tip: '💡 Standardidee: Eine Dame begrenzt das Feld, die zweite setzt Matt. Ohne weißen König in der Nähe: beide Damen bilden eine kleine „Fangzone“.',
    },
    {
      id: 'q_vs_k',
      priority: 94,
      match: function (p) {
        return (
          p.wQ === 1 &&
          p.wP === 0 &&
          p.wR === 0 &&
          p.wB === 0 &&
          p.wN === 0 &&
          p.bQ === 0 &&
          p.bR === 0 &&
          p.bB === 0 &&
          p.bN === 0 &&
          p.bP === 0
        );
      },
      title: 'Dame vs König (ohne Bauern)',
      goals: [
        'Merken: Ohne weißen König gibt es kein reguläres Matt — König heranführen.',
        'Box-Methode: mit der Dame ein immer kleineres Feld um den schwarzen König ziehen.',
        'Dame nie so nah stellen, dass der schwarze König patt steht.',
        'Klassisches Matt am Rand oder in der Ecke mit König + Dame üben und anwenden.',
      ],
      warnings: [
        '⚠️ PATT ist die Hauptgefahr — Dame blockiert alle Felder, schwarzer König darf nicht ziehen = Remis',
        '⚠️ Dame allein reicht nicht — ohne weißen König gibt es kein reguläres Matt',
        '⚠️ Matt in der Ecke oder am Rand üben — Mittelfeld-Matt braucht Königsnähe',
      ],
      tip: '💡 Merksatz: Erst den schwarzen König mit der Dame in die Ecke treiben, dann den weißen König heranführen und zuletzt die Dame für Matt einsetzen.',
    },
    {
      id: 'q_vs_q',
      priority: 71,
      match: function (p) {
        return (
          p.wQ >= 1 &&
          p.bQ >= 1 &&
          p.wR === 0 &&
          p.wB === 0 &&
          p.wN === 0 &&
          p.bR === 0 &&
          p.bB === 0 &&
          p.bN === 0
        );
      },
      title: 'Dame vs Dame',
      goals: [
        'Eigenen König sichern: Schach abwehren, Dauerschach des Gegners antizipieren.',
        'Damentausch nur, wenn das Endspiel danach gewonnen oder remis sicher ist.',
        'Tempo und Zugzwang auf dem Brett suchen — ein Zug kann alles ändern.',
        'Falls Bauern beteiligt sind: nach einem Tausch Freibauer und Durchbruch durchrechnen.',
      ],
      warnings: [
        '⚠️ Dauerschach und ewige Verfolgung — Remis ist oft drin wenn der schwächere König offen steht',
        '⚠️ Falschen Damentausch — aus Gewinn wird Remis oder Verlust',
        '⚠️ Königsangriffe unterschätzen — eine Dame kann matt drohen sobald der eigene König schwach steht',
      ],
      tip: '💡 Bei K+D vs K+D zählt meist: wer den gegnerischen König zuerst in Bedrängnis bringt oder den richtigen Tauschzeitpunkt wählt.',
    },
    {
      id: 'q_vs_alone',
      priority: 70,
      match: function (p) {
        return (
          p.wQ >= 1 &&
          p.bQ === 0 &&
          p.bR === 0 &&
          p.bB === 0 &&
          p.bN === 0 &&
          p.bP === 0
        );
      },
      title: 'Dame + Bauern vs nackter König',
      goals: [
        'Mit der Dame den schwarzen König in Richtung Rand drängen (Box).',
        'Weißen König aktiv einbeziehen — die Dame allein mattiert nicht.',
        'Die Box schrittweise verkleinern, ohne den schwarzen König patt zu stellen.',
        'Bauern nur so weit schieben, dass sie Matt unterstützen, nicht Patt erzeugen.',
      ],
      warnings: [
        '⚠️ PATT! Dame zu nah → schwarzer König hat keine Züge = Remis',
        '⚠️ Dame allein kann nicht mattsetzen — König MUSS mitspielen',
        '⚠️ Bauer nicht zu nah an schwarzen König schieben — Pattgefahr',
      ],
      tip: '💡 Box-Methode: Mit Dame ein immer kleiner werdendes Rechteck um den schwarzen König ziehen, dann König einmarschieren lassen.',
    },
    {
      id: 'qp_vs_q',
      priority: 72,
      match: function (p) {
        return p.wQ >= 1 && p.bQ >= 1 && p.wP >= 1 && p.bP === 0;
      },
      title: 'Dame + Bauer vs Dame',
      goals: [
        'Hauptziel: eigenen Bauer sicher auf die 7. Reihe bringen.',
        'Eigenen König zentral und sicher halten — Dauerschach der schwarzen Dame vermeiden.',
        'Schwarze Dame vom Bauern fernhalten oder zu einem günstigen Tausch zwingen.',
        'Damentausch nur, wenn das entstehende Bauernendspiel für dich gut ist.',
      ],
      warnings: [
        '⚠️ Turm- (a/h) und Läuferbauer (c/f) auf 7. Reihe mit König dahinter = nur REMIS!',
        '⚠️ Dauerschach: schwarze Dame rettet die Partie wenn König offen steht',
        '⚠️ Damentausch nur erzwingen wenn das entstehende Bauernendspiel gewonnen ist',
      ],
      tip: '💡 Nur d- und e-Bauer auf 7. Reihe gewinnen sicher. Alle anderen Bauern haben Remismöglichkeiten für Schwarz!',
    },
    {
      id: 'kpp_vs_kpp',
      priority: 63,
      match: function (p) {
        return noOther(p) && p.wP === 2 && p.bP === 2;
      },
      title: '2 vs 2 Bauern — beidseitig',
      goals: [
        'Könige: Opposition oder Fernopposition nutzen, um als Erster einzubrechen.',
        'Auf einem Flügel einen Freibauer anstreben — der andere Flügel zieht oft den gegnerischen König.',
        'Verbundene Bauern schützen, getrennte dynamischer opfern oder rennen lassen.',
        'Ganzbrett-Zugzwang denken — auch scheinbar „leere“ Königszüge können entscheiden.',
      ],
      goalOne: 'König aktivieren und nach einem Durchbruch auf einer Seite suchen.',
      warnings: [
        '⚠️ Symmetrische Stellungen täuschen — Zugrecht und kleine Unterschiede entscheiden',
        '⚠️ Ein Freibauer auf einer Seite während du auf der anderen schwach bist',
        '⚠️ Doppelbauern auf einer Seite verschärfen oft die Verteidigung des Gegners',
      ],
      tip: '💡 2 vs 2 ist ein Klassiker: oft gewinnt, wer den gegnerischen König zuerst an die falsche Seite bindet.',
    },
    {
      id: 'kppp_vs_kppp',
      priority: 62,
      match: function (p) {
        return noOther(p) && p.wP === 3 && p.bP === 3;
      },
      title: '3 vs 3 Bauern — komplexes Königsspiel',
      goals: [
        'Pro Flügel notieren: wo entsteht bei dir zuerst ein potenzieller Freibauer?',
        'Außenbauer priorisieren — sie lenken den gegnerischen König am weitesten.',
        'Keine Tausche ohne Folgeplan; nach jedem Tausch das neue Unterendspiel neu bewerten.',
        'König so lange zentral wie möglich, bis klar ist, welcher Flügel die Partie entscheidet.',
      ],
      goalOne: 'Pläne pro Flügel machen: wo entsteht der erste Freibauer?',
      warnings: [
        '⚠️ Drei gegen drei kann trotz Gleichheit gewonnen oder verloren sein',
        '⚠️ Ein einziger Freibauer kann die ganze Partie entscheiden',
        '⚠️ Blockaden und ewige Remis-Ideen sind häufig',
      ],
      tip: '💡 Gleiche Bauernzahl heißt nicht Gleichstand — Königsposition und Freibauern-Ideen zählen.',
    },
    {
      id: 'doubled_pawns_endgame',
      priority: 64,
      match: function (p) {
        if (!noOther(p) || p.wP + p.bP < 2) return false;
        return p.wPmaxOnFile >= 2 || p.bPmaxOnFile >= 2;
      },
      title: 'Doppelbauern im Bauernendspiel',
      goals: [
        'Eigene Doppelbauern als einen „vorderen“ Bauer behandeln — Plan für einen echten Freibauer.',
        'König aktivieren, um die blockierte Linie zu umgehen oder den Gegner zu binden.',
        'Gegnerische Doppelbauern blockieren oder den vorderen attackieren.',
        'Opfer einplanen, wenn danach ein klarer Freibauer oder Zugzwang entsteht.',
      ],
      goalOne: 'Doppelbauern nicht als „zwei Bauern“ zählen — oft zählt nur der vordere.',
      warnings: [
        '⚠️ Doppelbauern auf einer Linie blockieren oft den eigenen König',
        '⚠️ Der Gegner blockiert leicht die Spitze der Kette',
        '⚠️ Auf beiden Seiten Doppelbauern — oft entsteht Zugzwang um die Schwäche',
      ],
      tip: '💡 Doppelbauern = weniger flexible Bauern — aktiver König und andere Linien ausgleichen das oft.',
    },
    {
      id: 'passed_race',
      priority: 60,
      match: function (p) {
        return p.wP >= 1 && p.bP >= 1 && noOther(p);
      },
      title: 'Freibauer — Quadratregel & Rennen',
      goals: [
        'Für jeden kritischen Bauern: Quadrat vom Feld des Bauern bis zur Umwandlungsreihe — steckt der gegnerische König drin?',
        'Eigenen König so stellen, dass er gegnerische Freibauern bremst oder dein Rennen gewinnt.',
        'Beim Durchlaufen: Umwandlung mit Schach anstreben, wenn es ein Tempo kostet.',
        'Durchzählen: wer zuerst Dame? Bei Gleichstand Varianten mit Schach oder Tausch prüfen.',
      ],
      warnings: [
        '⚠️ Quadratregel vergessen — schwarzer König läuft scheinbar hinterher aber stoppt den Bauern',
        '⚠️ Umwandlung ohne Schach kann verlieren wenn Gegner sofort umwandelt',
        '⚠️ Remis wenn beide gleichzeitig Dame bekommen und Dauerschach möglich',
      ],
      tip: '💡 Quadrat vom Bauern zur 8. Reihe zeichnen: Ist der schwarze König DARIN → stoppt er den Bauern. DRAUSSEN → Umwandlung!',
    },
    {
      id: 'general',
      priority: 1,
      match: function (p) {
        if (noPawnNoQueenBishopKnight(p) && (p.wR > 0 || p.bR > 0)) return false;
        return true;
      },
      title: 'Bauernendspiel — Grundprinzipien',
      goals: [
        'König so früh wie möglich aktivieren — im Endspiel ist er eine Hauptfigur.',
        'Freibauern anstreben: Bauer ohne gegnerischen Bauern auf derselben Linie.',
        'Opposition und Königsduelle nutzen, um den Einbruch zu erzwingen.',
        'Zugzwang suchen: den Gegner zu schlechteren Zügen zwingen.',
      ],
      warnings: [
        '⚠️ Passiver König verliert fast immer',
        '⚠️ Bauern zu früh vorrücken ohne Königsunterstützung',
        '⚠️ Pattfallen beim Einengen des gegnerischen Königs übersehen',
      ],
      tip: '💡 Die drei goldenen Regeln: 1) König aktivieren, 2) Freibauern schaffen, 3) Opposition halten.',
    },
  ];

  function detectSituationFromGame(chessGame) {
    var p = getPieceCountsFromGame(chessGame);
    if (!p) return null;
    var matches = ENDGAME_CATALOG.filter(function (e) {
      try {
        return e.match(p);
      } catch (err) {
        return false;
      }
    });
    if (!matches.length) return null;
    matches.sort(function (a, b) {
      return b.priority - a.priority;
    });
    return matches[0];
  }

  var api = {
    ENDGAME_CATALOG: ENDGAME_CATALOG,
    noOther: noOther,
    isFileMirrorPawnStructure: isFileMirrorPawnStructure,
    getPieceCountsFromGame: getPieceCountsFromGame,
    detectSituationFromGame: detectSituationFromGame,
  };

  global.EndspielgottCatalog = api;
})(typeof window !== 'undefined' ? window : this);
