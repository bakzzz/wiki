from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

async def search_pages(db: AsyncSession, query: str, limit: int = 20):
    """Full-text search across pages using PostgreSQL tsvector/tsquery with ts_headline for highlighting."""
    sql = text("""
        SELECT 
            id, title, slug, path::text as path,
            ts_headline('russian', coalesce(content, ''), plainto_tsquery('russian', :query),
                'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') as headline,
            ts_rank(
                to_tsvector('russian', coalesce(title, '') || ' ' || coalesce(content, '')),
                plainto_tsquery('russian', :query)
            ) as rank
        FROM pages
        WHERE 
            to_tsvector('russian', coalesce(title, '') || ' ' || coalesce(content, ''))
            @@ plainto_tsquery('russian', :query)
        ORDER BY rank DESC
        LIMIT :limit
    """)
    result = await db.execute(sql, {"query": query, "limit": limit})
    rows = result.mappings().all()
    return [dict(row) for row in rows]
