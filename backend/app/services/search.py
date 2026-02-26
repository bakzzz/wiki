from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def search_pages(db: AsyncSession, query: str, limit: int = 20):
    """
    Search pages using a combined approach:
    1. pg_trgm similarity for fuzzy/partial matching on title
    2. ILIKE for substring matching in both title and content
    Results are ranked by: exact title match > title similarity > content match.
    """
    # Ensure pg_trgm extension
    await db.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))

    pattern = f"%{query}%"

    sql = text("""
        SELECT DISTINCT ON (id)
            id, title, slug, path::text as path,
            CASE
                WHEN title ILIKE :exact THEN 100
                WHEN title ILIKE :pattern THEN 50 + similarity(title, :query) * 30
                WHEN content ILIKE :pattern THEN similarity(title, :query) * 20
                ELSE 0
            END as rank,
            CASE
                WHEN content ILIKE :pattern THEN
                    substring(content from greatest(1, position(lower(:query) in lower(content)) - 60) for 150)
                ELSE ''
            END as headline
        FROM pages
        WHERE
            title ILIKE :pattern
            OR content ILIKE :pattern
            OR similarity(title, :query) > 0.1
        ORDER BY id, rank DESC
        LIMIT :limit
    """)

    result = await db.execute(sql, {
        "query": query,
        "pattern": pattern,
        "exact": query,
        "limit": limit,
    })
    rows = result.mappings().all()

    # Sort by rank descending (DISTINCT ON loses the ORDER BY rank)
    results = sorted([dict(row) for row in rows], key=lambda r: r.get("rank", 0), reverse=True)

    # Add highlight markers to headline
    for r in results:
        if r.get("headline"):
            hl = r["headline"]
            # Simple highlight: wrap query matches in <mark>
            import re
            r["headline"] = re.sub(
                re.escape(query),
                lambda m: f"<mark>{m.group()}</mark>",
                hl,
                flags=re.IGNORECASE,
            )
        else:
            r["headline"] = ""

    return results
