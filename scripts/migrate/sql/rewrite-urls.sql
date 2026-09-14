-- Loving Charmz — repoint stored storage URLs at the new project.
--   psql "$NEW_DB_URL" -X -v ON_ERROR_STOP=1 \
--     -v old_ref=otareqhvjbcbiehmgzda -v new_ref=ivvsglfjlmejwmwofvuw \
--     -f scripts/migrate/sql/rewrite-urls.sql
--
-- Only the project ref inside the host changes; object paths, query strings
-- (including avatar cache-busters) and external Unsplash URLs are untouched.

begin;

-- products.images is a text[]; rewrite each element in place.
update public.products
set images = array(
      select replace(elem, :'old_ref', :'new_ref')
      from unnest(images) as elem
    )
where array_to_string(images, ',') like '%' || :'old_ref' || '%';

update public.collections
set image_url = replace(image_url, :'old_ref', :'new_ref')
where image_url like '%' || :'old_ref' || '%';

update public.content_blocks
set image_url = replace(image_url, :'old_ref', :'new_ref')
where image_url like '%' || :'old_ref' || '%';

update public.profiles
set avatar_url = replace(avatar_url, :'old_ref', :'new_ref')
where avatar_url like '%' || :'old_ref' || '%';

update public.personalization_requests
set reference_image_url = replace(reference_image_url, :'old_ref', :'new_ref')
where reference_image_url like '%' || :'old_ref' || '%';

commit;

-- Remaining references must be zero.
select 'remaining_old_ref_rows' as check,
       (select count(*) from public.products where array_to_string(images, ',') like '%' || :'old_ref' || '%')
     + (select count(*) from public.collections where image_url like '%' || :'old_ref' || '%')
     + (select count(*) from public.content_blocks where image_url like '%' || :'old_ref' || '%')
     + (select count(*) from public.profiles where avatar_url like '%' || :'old_ref' || '%')
     + (select count(*) from public.personalization_requests where reference_image_url like '%' || :'old_ref' || '%')
       as value;
