import { he } from "@/lib/i18n";
import Link from "next/link";

export default function Learn() {
  return (
    <div className="flex flex-col items-center min-h-dvh p-6">
      <div className="text-center mt-12 mb-8">
        <h1 className="text-5xl font-black text-primary">{he.gameName}</h1>
        <h2 className="text-xl text-text-muted mt-2">{he.howToPlay}</h2>
        <div className="text-accent text-2xl mt-3">&#9830;</div>
      </div>

      <div className="w-full max-w-lg space-y-4 text-lg leading-relaxed">
        <p>
          במהלך המשחק יוצגו בפניכם עובדות מוזרות ומפתיעות, אבל החלק המעניין
          חסר.
        </p>
        <p>
          כל השחקנים משחקים מהטלפון שלהם וממלאים את החלק החסר עם השקרים הכי
          משכנעים שהם יכולים להמציא — כאלה שיעבדו על החברים.
        </p>
        <p>
          כל השקרים יוצגו יחד עם האמת האמיתית והמצוטטת. המטרה שלכם היא לא ליפול
          בבולשיט של החברים ולמצוא את האמת.
        </p>
        <p>אם תבחרו את התשובה האמיתית — תקבלו נקודות.</p>
        <p>על כל חבר שתעבדו — גם תקבלו נקודות.</p>

        <div className="border-t border-surface-lighter pt-4 mt-6 space-y-3">
          <p>
            כשתהיו מוכנים להתחיל, בחרו את האדם הכי אחראי בקבוצה ובקשו ממנו{" "}
            <Link href="/create" className="text-primary underline">
              ליצור משחק חדש
            </Link>
            .
          </p>
          <p>
            כל השאר יכולים{" "}
            <Link href="/join" className="text-primary underline">
              להצטרף
            </Link>{" "}
            באמצעות קוד המשחק.
          </p>
          <p>
            לחוויה הטובה ביותר, מומלץ להשיג מסך נוסף ו
            <Link href="/present" className="text-primary underline">
              להציג
            </Link>{" "}
            את המשחק שם.
          </p>
        </div>
      </div>
    </div>
  );
}
