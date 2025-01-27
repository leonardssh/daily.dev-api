import { FastifyInstance } from 'fastify';
import isbot from 'isbot';
import { Post } from '../entity';
import { notifyView } from '../common';
import createOrGetConnection from '../db';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: { postId: string }; Querystring: { a?: string } }>(
    '/:postId',
    async (req, res) => {
      const con = await createOrGetConnection();
      const post = await con.getRepository(Post).findOne({
        select: ['id', 'url', 'tagsStr'],
        where: [{ id: req.params.postId }, { shortId: req.params.postId }],
      });
      if (!post) {
        return res.status(404).send();
      }
      if (!req.headers['user-agent'] || isbot(req.headers['user-agent'])) {
        return res.status(302).redirect(post.url);
      }
      const userId = req.userId || req.cookies.da2;
      if (userId) {
        notifyView(
          req.log,
          post.id,
          userId,
          req.headers['referer'],
          new Date(),
          post.tagsStr?.split?.(',') ?? [],
        );
      }
      return res
        .headers({
          'Referrer-Policy': 'origin, origin-when-cross-origin',
          Link: `<${post.url}>; rel="preconnect"`,
        })
        .type('text/html')
        .send(
          `<html><head><meta http-equiv="refresh" content="0;URL=${post.url}${
            req.query.a ? `#${req.query.a}` : ''
          }"></head></html>`,
        );
    },
  );
}
